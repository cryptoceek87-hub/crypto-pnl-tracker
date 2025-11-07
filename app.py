from flask import Flask, render_template, request, jsonify, send_file
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
import pandas as pd
from datetime import datetime
import io
import os
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment

app = Flask(__name__)
CORS(app)

# Database configuration
DATABASE_URL = os.environ.get('DATABASE_URL')
if DATABASE_URL:
    if DATABASE_URL.startswith('postgres://'):
        DATABASE_URL = DATABASE_URL.replace('postgres://', 'postgresql://')
else:
    # Use SQLite as fallback when DATABASE_URL is not set
    DATABASE_URL = 'sqlite:///pnl_tracker.db'

app.config['SQLALCHEMY_DATABASE_URI'] = DATABASE_URL
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# Exchange rate
EXCHANGE_RATE = 80

# Database Model
class Entry(db.Model):
    __tablename__ = 'entries'
    
    id = db.Column(db.Integer, primary_key=True)
    date = db.Column(db.Date, nullable=False)
    gain = db.Column(db.Float, default=0)
    loss = db.Column(db.Float, default=0)
    wd = db.Column(db.Float, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'Date': self.date.strftime('%Y-%m-%d'),
            'Gain': self.gain,
            'Loss': self.loss,
            'WD': self.wd
        }

# Create tables
with app.app_context():
    db.create_all()

def calculate_daily_metrics(data):
    """Calculate all derived columns for daily data"""
    if not data:
        return []
    
    df = pd.DataFrame(data)
    df['Date'] = pd.to_datetime(df['Date'])
    df = df.sort_values('Date').reset_index(drop=True)
    
    # Fill NaN with 0 for calculations
    df['Gain'] = df['Gain'].fillna(0)
    df['Loss'] = df['Loss'].fillna(0)
    df['WD'] = df['WD'].fillna(0)
    
    # Calculate cumulative gains and losses
    df['Cgain'] = df['Gain'].cumsum()
    df['Closs'] = df['Loss'].cumsum()
    
    # Calculate daily net
    df['Net'] = df['Gain'] - df['Loss']
    
    # Calculate cumulative net
    df['Cum'] = df['Net'].cumsum()
    
    # Calculate W/D in Rupees
    df['WD_INR'] = df['WD'] * EXCHANGE_RATE
    
    # Calculate cumulative W/D
    df['CWD'] = df['WD'].cumsum()
    df['CWD_INR'] = df['CWD'] * EXCHANGE_RATE
    
    # Calculate balance
    df['Balance'] = df['Cum'] - df['CWD']
    
    # Add serial number
    df.insert(0, 'Sl', range(1, len(df) + 1))
    
    # Convert to dict for JSON
    df['Date'] = df['Date'].dt.strftime('%Y-%m-%d')
    return df.to_dict('records')

def calculate_monthly_summary(daily_data):
    """Calculate monthly summary from daily data"""
    if not daily_data:
        return []
    
    df = pd.DataFrame(daily_data)
    df['Date'] = pd.to_datetime(df['Date'])
    df['Month'] = df['Date'].dt.to_period('M')
    
    # Group by month
    monthly = df.groupby('Month').agg({
        'Gain': 'sum',
        'Loss': 'sum',
        'WD': 'sum',
        'WD_INR': 'sum'
    }).reset_index()
    
    # Convert period to timestamp
    monthly['Month'] = monthly['Month'].dt.to_timestamp()
    
    # Calculate net
    monthly['Net'] = monthly['Gain'] - monthly['Loss']
    
    # Calculate cumulative net
    monthly['Cum'] = monthly['Net'].cumsum()
    
    # Calculate cumulative W/D
    monthly['CWD'] = monthly['WD'].cumsum()
    monthly['CWD_INR'] = monthly['CWD'] * EXCHANGE_RATE
    
    # Calculate balance
    monthly['Balance'] = monthly['Cum'] - monthly['CWD']
    
    # Add serial number
    monthly.insert(0, 'Sl', range(1, len(monthly) + 1))
    
    # Convert to dict for JSON
    monthly['Month'] = monthly['Month'].dt.strftime('%Y-%m-%d')
    return monthly.to_dict('records')

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/entries', methods=['GET'])
def get_entries():
    """Get all entries from database"""
    try:
        entries = Entry.query.order_by(Entry.date).all()
        data = [entry.to_dict() for entry in entries]
        return jsonify({
            'success': True,
            'data': data
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400

@app.route('/api/entries', methods=['POST'])
def add_entry():
    """Add new entry to database"""
    try:
        data = request.json
        entry = Entry(
            date=datetime.strptime(data['Date'], '%Y-%m-%d').date(),
            gain=float(data.get('Gain', 0)),
            loss=float(data.get('Loss', 0)),
            wd=float(data.get('WD', 0))
        )
        db.session.add(entry)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Entry added successfully'
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400

@app.route('/api/entries/<int:entry_id>', methods=['DELETE'])
def delete_entry(entry_id):
    """Delete entry from database"""
    try:
        entry = Entry.query.get(entry_id)
        if entry:
            db.session.delete(entry)
            db.session.commit()
            return jsonify({
                'success': True,
                'message': 'Entry deleted successfully'
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Entry not found'
            }), 404
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400

@app.route('/api/calculate', methods=['POST'])
def calculate():
    """Calculate metrics for the provided data"""
    try:
        data = request.json.get('data', [])
        daily_metrics = calculate_daily_metrics(data)
        monthly_summary = calculate_monthly_summary(daily_metrics)
        
        return jsonify({
            'success': True,
            'daily': daily_metrics,
            'monthly': monthly_summary
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400

@app.route('/api/export/excel', methods=['POST'])
def export_excel():
    """Export data to Excel file"""
    try:
        data = request.json.get('data', [])
        daily_metrics = calculate_daily_metrics(data)
        monthly_summary = calculate_monthly_summary(daily_metrics)
        
        # Create Excel file
        wb = Workbook()
        
        # Daily sheet
        ws_daily = wb.active
        ws_daily.title = "DateWise"
        
        # Headers
        headers = ['Sl', 'Date', 'Gain(in $)', 'Cgain(in$)', 'Loss(in $)', 'Closs(in$)', 
                  'Net(in $)', 'Cum(in $)', 'W/D(in $)', 'W/D(in R)', 'CWD(in$)', 'CWD(inR)', 'Balance($)']
        ws_daily.append(headers)
        
        # Style headers
        header_fill = PatternFill(start_color="366092", end_color="366092", fill_type="solid")
        header_font = Font(bold=True, color="FFFFFF")
        
        for cell in ws_daily[1]:
            cell.fill = header_fill
            cell.font = header_font
            cell.alignment = Alignment(horizontal='center')
        
        # Add data
        for item in daily_metrics:
            ws_daily.append([
                item.get('Sl'),
                item.get('Date'),
                item.get('Gain'),
                item.get('Cgain'),
                item.get('Loss'),
                item.get('Closs'),
                item.get('Net'),
                item.get('Cum'),
                item.get('WD'),
                item.get('WD_INR'),
                item.get('CWD'),
                item.get('CWD_INR'),
                item.get('Balance')
            ])
        
        # Monthly sheet
        ws_monthly = wb.create_sheet("Monthwise")
        
        headers_monthly = ['Sl', 'Month', 'Gain(in $)', 'Loss(in $)', 'Net(in $)', 
                          'Cum(in $)', 'W/D(in $)', 'W/D(in R)', 'CWD(in$)', 'CWD(inR)', 'Balance($)']
        ws_monthly.append(headers_monthly)
        
        for cell in ws_monthly[1]:
            cell.fill = header_fill
            cell.font = header_font
            cell.alignment = Alignment(horizontal='center')
        
        for item in monthly_summary:
            ws_monthly.append([
                item.get('Sl'),
                item.get('Month'),
                item.get('Gain'),
                item.get('Loss'),
                item.get('Net'),
                item.get('Cum'),
                item.get('WD'),
                item.get('WD_INR'),
                item.get('CWD'),
                item.get('CWD_INR'),
                item.get('Balance')
            ])
        
        # Save to BytesIO
        output = io.BytesIO()
        wb.save(output)
        output.seek(0)
        
        return send_file(
            output,
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            as_attachment=True,
            download_name=f'PnL_Tracker_{datetime.now().strftime("%Y%m%d")}.xlsx'
        )
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400

@app.route('/api/import/excel', methods=['POST'])
def import_excel():
    """Import data from Excel file and save to database"""
    try:
        if 'file' not in request.files:
            return jsonify({'success': False, 'error': 'No file provided'}), 400
        
        file = request.files['file']
        
        if file.filename.endswith('.xlsx') or file.filename.endswith('.xls'):
            df = pd.read_excel(file, sheet_name='DateWise')
        elif file.filename.endswith('.csv'):
            df = pd.read_csv(file)
        else:
            return jsonify({'success': False, 'error': 'Invalid file format'}), 400
        
        # Keep only required columns
        required_cols = ['Date', 'Gain(in $)', 'Loss(in $)', 'W/D(in $)']
        
        if not all(col in df.columns for col in required_cols):
            return jsonify({'success': False, 'error': 'Missing required columns'}), 400
        
        # Clear existing entries
        Entry.query.delete()
        
        # Add new entries
        for _, row in df.iterrows():
            if pd.notna(row['Date']):
                entry = Entry(
                    date=pd.to_datetime(row['Date']).date(),
                    gain=float(row['Gain(in $)']) if pd.notna(row['Gain(in $)']) else 0,
                    loss=float(row['Loss(in $)']) if pd.notna(row['Loss(in $)']) else 0,
                    wd=float(row['W/D(in $)']) if pd.notna(row['W/D(in $)']) else 0
                )
                db.session.add(entry)
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Data imported successfully'
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400

@app.route('/api/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({'status': 'healthy', 'timestamp': datetime.now().isoformat()})

if __name__ == '__main__':
    import os
    port = int(os.environ.get('PORT', 5000))
    app.run(debug=False, host='0.0.0.0', port=port)
