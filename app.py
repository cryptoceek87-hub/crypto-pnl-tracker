import streamlit as st
import pandas as pd
import plotly.graph_objects as go
import plotly.express as px
from datetime import datetime, timedelta
import io

# Page configuration
st.set_page_config(
    page_title="Crypto P&L Tracker",
    page_icon="💰",
    layout="wide"
)

# Initialize session state for data storage
if 'daily_data' not in st.session_state:
    st.session_state.daily_data = pd.DataFrame(columns=[
        'Date', 'Gain(in $)', 'Loss(in $)', 'W/D(in $)'
    ])

# Exchange rate (can be modified)
EXCHANGE_RATE = 80

def calculate_daily_metrics(df):
    """Calculate all derived columns for daily data"""
    if df.empty:
        return df
    
    # Sort by date
    df = df.sort_values('Date').reset_index(drop=True)
    
    # Fill NaN with 0 for calculations
    df['Gain(in $)'] = df['Gain(in $)'].fillna(0)
    df['Loss(in $)'] = df['Loss(in $)'].fillna(0)
    df['W/D(in $)'] = df['W/D(in $)'].fillna(0)
    
    # Calculate cumulative gains and losses
    df['Cgain(in$)'] = df['Gain(in $)'].cumsum()
    df['Closs(in$)'] = df['Loss(in $)'].cumsum()
    
    # Calculate daily net
    df['Net(in $)'] = df['Gain(in $)'] - df['Loss(in $)']
    
    # Calculate cumulative net
    df['Cum(in $)'] = df['Net(in $)'].cumsum()
    
    # Calculate W/D in Rupees
    df['W/D(in R)'] = df['W/D(in $)'] * EXCHANGE_RATE
    
    # Calculate cumulative W/D
    df['CWD(in$)'] = df['W/D(in $)'].cumsum()
    df['CWD(inR)'] = df['CWD(in$)'] * EXCHANGE_RATE
    
    # Calculate balance
    df['Balance($)'] = df['Cum(in $)'] - df['CWD(in$)']
    
    # Add serial number
    df.insert(0, 'Sl', range(1, len(df) + 1))
    
    return df

def calculate_monthly_summary(daily_df):
    """Calculate monthly summary from daily data"""
    if daily_df.empty:
        return pd.DataFrame()
    
    # Create a copy and ensure date is datetime
    df = daily_df.copy()
    df['Month'] = pd.to_datetime(df['Date']).dt.to_period('M')
    
    # Group by month
    monthly = df.groupby('Month').agg({
        'Gain(in $)': 'sum',
        'Loss(in $)': 'sum',
        'W/D(in $)': 'sum',
        'W/D(in R)': 'sum'
    }).reset_index()
    
    # Convert period to timestamp
    monthly['Month'] = monthly['Month'].dt.to_timestamp()
    
    # Calculate net
    monthly['Net(in $)'] = monthly['Gain(in $)'] - monthly['Loss(in $)']
    
    # Calculate cumulative net
    monthly['Cum(in $)'] = monthly['Net(in $)'].cumsum()
    
    # Calculate cumulative W/D
    monthly['CWD(in$)'] = monthly['W/D(in $)'].cumsum()
    monthly['CWD(inR)'] = monthly['CWD(in$)'] * EXCHANGE_RATE
    
    # Calculate balance
    monthly['Balance($)'] = monthly['Cum(in $)'] - monthly['CWD(in$)']
    
    # Add serial number
    monthly.insert(0, 'Sl', range(1, len(monthly) + 1))
    
    # Reorder columns
    monthly = monthly[['Sl', 'Month', 'Gain(in $)', 'Loss(in $)', 'Net(in $)', 
                       'Cum(in $)', 'W/D(in $)', 'W/D(in R)', 'CWD(in$)', 'CWD(inR)', 'Balance($)']]
    
    return monthly

# Title and description
st.title("💰 Crypto Trading P&L Tracker")
st.markdown("### Track your daily gains, losses, and withdrawals with automatic calculations")

# Sidebar for data entry and controls
with st.sidebar:
    st.header("📊 Controls")
    
    # Exchange rate setting
    exchange_rate = st.number_input("Exchange Rate (₹/$)", value=EXCHANGE_RATE, min_value=1.0, step=0.1)
    EXCHANGE_RATE = exchange_rate
    
    st.markdown("---")
    st.header("➕ Add New Entry")
    
    with st.form("add_entry"):
        entry_date = st.date_input("Date", value=datetime.now())
        gain = st.number_input("Gain (in $)", min_value=0.0, step=0.01, format="%.2f")
        loss = st.number_input("Loss (in $)", min_value=0.0, step=0.01, format="%.2f")
        wd = st.number_input("Withdrawal/Deposit (in $)", step=0.01, format="%.2f", 
                             help="Positive for withdrawal, negative for deposit")
        
        submit_button = st.form_submit_button("Add Entry", use_container_width=True)
        
        if submit_button:
            new_entry = pd.DataFrame([{
                'Date': entry_date,
                'Gain(in $)': gain if gain > 0 else None,
                'Loss(in $)': loss if loss > 0 else None,
                'W/D(in $)': wd if wd != 0 else None
            }])
            
            st.session_state.daily_data = pd.concat([st.session_state.daily_data, new_entry], ignore_index=True)
            st.success("✅ Entry added successfully!")
            st.rerun()
    
    st.markdown("---")
    
    # Import/Export section
    st.header("📁 Import/Export")
    
    # Export button
    if not st.session_state.daily_data.empty:
        daily_calc = calculate_daily_metrics(st.session_state.daily_data.copy())
        
        # Create Excel file with both sheets
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            daily_calc.to_excel(writer, sheet_name='DateWise', index=False)
            monthly = calculate_monthly_summary(daily_calc)
            if not monthly.empty:
                monthly.to_excel(writer, sheet_name='Monthwise', index=False)
        
        st.download_button(
            label="📥 Download Excel",
            data=output.getvalue(),
            file_name=f"PnL_Tracker_{datetime.now().strftime('%Y%m%d')}.xlsx",
            mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            use_container_width=True
        )
    
    # Import button
    uploaded_file = st.file_uploader("📤 Upload CSV/Excel", type=['csv', 'xlsx', 'xls'])
    if uploaded_file is not None:
        try:
            if uploaded_file.name.endswith('.csv'):
                imported_data = pd.read_csv(uploaded_file)
            else:
                imported_data = pd.read_excel(uploaded_file, sheet_name='DateWise')
            
            # Keep only the input columns
            required_cols = ['Date', 'Gain(in $)', 'Loss(in $)', 'W/D(in $)']
            if all(col in imported_data.columns for col in required_cols):
                st.session_state.daily_data = imported_data[required_cols].copy()
                st.success("✅ Data imported successfully!")
                st.rerun()
            else:
                st.error("❌ File must contain: Date, Gain(in $), Loss(in $), W/D(in $)")
        except Exception as e:
            st.error(f"❌ Error importing file: {str(e)}")
    
    st.markdown("---")
    
    # Clear data button
    if st.button("🗑️ Clear All Data", use_container_width=True):
        st.session_state.daily_data = pd.DataFrame(columns=['Date', 'Gain(in $)', 'Loss(in $)', 'W/D(in $)'])
        st.rerun()

# Main content area
if st.session_state.daily_data.empty:
    st.info("👈 Add your first entry using the sidebar to get started!")
else:
    # Calculate metrics
    daily_calc = calculate_daily_metrics(st.session_state.daily_data.copy())
    monthly = calculate_monthly_summary(daily_calc)
    
    # Tabs for different views
    tab1, tab2, tab3, tab4 = st.tabs(["📊 Dashboard", "📅 Daily View", "📆 Monthly View", "📈 Charts"])
    
    with tab1:
        st.header("Key Metrics")
        
        # Summary metrics
        col1, col2, col3, col4 = st.columns(4)
        
        with col1:
            total_gain = daily_calc['Gain(in $)'].sum()
            st.metric("Total Gains", f"${total_gain:.2f}", delta=None)
        
        with col2:
            total_loss = daily_calc['Loss(in $)'].sum()
            st.metric("Total Losses", f"${total_loss:.2f}", delta=None)
        
        with col3:
            net_profit = total_gain - total_loss
            st.metric("Net P&L", f"${net_profit:.2f}", 
                     delta=f"${net_profit:.2f}", 
                     delta_color="normal")
        
        with col4:
            current_balance = daily_calc['Balance($)'].iloc[-1]
            st.metric("Current Balance", f"${current_balance:.2f}",
                     delta=f"${current_balance:.2f}",
                     delta_color="normal")
        
        st.markdown("---")
        
        # Additional metrics
        col1, col2, col3, col4 = st.columns(4)
        
        with col1:
            total_wd = daily_calc['W/D(in $)'].sum()
            st.metric("Total W/D", f"${total_wd:.2f}")
        
        with col2:
            total_wd_inr = total_wd * EXCHANGE_RATE
            st.metric("Total W/D (₹)", f"₹{total_wd_inr:.2f}")
        
        with col3:
            trading_days = len(daily_calc[daily_calc['Net(in $)'] != 0])
            st.metric("Trading Days", trading_days)
        
        with col4:
            if trading_days > 0:
                avg_daily_pnl = net_profit / trading_days
                st.metric("Avg Daily P&L", f"${avg_daily_pnl:.2f}")
            else:
                st.metric("Avg Daily P&L", "$0.00")
        
        st.markdown("---")
        
        # Recent entries
        st.subheader("📋 Recent Entries (Last 10)")
        recent = daily_calc.tail(10).sort_values('Date', ascending=False)
        st.dataframe(recent, use_container_width=True, hide_index=True)
    
    with tab2:
        st.header("Daily P&L Records")
        
        # Filter options
        col1, col2 = st.columns(2)
        with col1:
            date_filter = st.radio("Filter by:", ["All", "Last 7 days", "Last 30 days", "Custom range"])
        
        if date_filter == "Last 7 days":
            cutoff = datetime.now() - timedelta(days=7)
            filtered_df = daily_calc[pd.to_datetime(daily_calc['Date']) >= cutoff]
        elif date_filter == "Last 30 days":
            cutoff = datetime.now() - timedelta(days=30)
            filtered_df = daily_calc[pd.to_datetime(daily_calc['Date']) >= cutoff]
        elif date_filter == "Custom range":
            with col2:
                start_date = st.date_input("Start date")
                end_date = st.date_input("End date")
            filtered_df = daily_calc[
                (pd.to_datetime(daily_calc['Date']) >= pd.to_datetime(start_date)) &
                (pd.to_datetime(daily_calc['Date']) <= pd.to_datetime(end_date))
            ]
        else:
            filtered_df = daily_calc
        
        # Display data
        st.dataframe(filtered_df, use_container_width=True, hide_index=True, height=600)
        
        # Download filtered data
        csv = filtered_df.to_csv(index=False)
        st.download_button(
            label="📥 Download as CSV",
            data=csv,
            file_name=f"daily_pnl_{datetime.now().strftime('%Y%m%d')}.csv",
            mime="text/csv"
        )
    
    with tab3:
        st.header("Monthly Summary")
        
        if not monthly.empty:
            st.dataframe(monthly, use_container_width=True, hide_index=True, height=600)
            
            # Download monthly data
            csv = monthly.to_csv(index=False)
            st.download_button(
                label="📥 Download as CSV",
                data=csv,
                file_name=f"monthly_summary_{datetime.now().strftime('%Y%m%d')}.csv",
                mime="text/csv"
            )
        else:
            st.info("No monthly data available yet.")
    
    with tab4:
        st.header("Performance Charts")
        
        # Cumulative P&L chart
        fig = go.Figure()
        fig.add_trace(go.Scatter(
            x=daily_calc['Date'],
            y=daily_calc['Cum(in $)'],
            mode='lines+markers',
            name='Cumulative P&L',
            line=dict(color='#00CC96', width=3),
            fill='tozeroy'
        ))
        fig.update_layout(
            title="Cumulative P&L Over Time",
            xaxis_title="Date",
            yaxis_title="Cumulative P&L ($)",
            hovermode='x unified',
            height=400
        )
        st.plotly_chart(fig, use_container_width=True)
        
        # Gains vs Losses chart
        col1, col2 = st.columns(2)
        
        with col1:
            fig_gains_losses = go.Figure()
            fig_gains_losses.add_trace(go.Bar(
                x=daily_calc['Date'],
                y=daily_calc['Gain(in $)'],
                name='Gains',
                marker_color='green'
            ))
            fig_gains_losses.add_trace(go.Bar(
                x=daily_calc['Date'],
                y=daily_calc['Loss(in $)'],
                name='Losses',
                marker_color='red'
            ))
            fig_gains_losses.update_layout(
                title="Daily Gains vs Losses",
                xaxis_title="Date",
                yaxis_title="Amount ($)",
                barmode='group',
                height=400
            )
            st.plotly_chart(fig_gains_losses, use_container_width=True)
        
        with col2:
            # Balance over time
            fig_balance = go.Figure()
            fig_balance.add_trace(go.Scatter(
                x=daily_calc['Date'],
                y=daily_calc['Balance($)'],
                mode='lines+markers',
                name='Balance',
                line=dict(color='#FFA500', width=3)
            ))
            fig_balance.update_layout(
                title="Account Balance Over Time",
                xaxis_title="Date",
                yaxis_title="Balance ($)",
                hovermode='x unified',
                height=400
            )
            st.plotly_chart(fig_balance, use_container_width=True)
        
        # Monthly summary chart
        if not monthly.empty:
            fig_monthly = go.Figure()
            fig_monthly.add_trace(go.Bar(
                x=monthly['Month'],
                y=monthly['Net(in $)'],
                name='Monthly Net P&L',
                marker_color=['green' if x > 0 else 'red' for x in monthly['Net(in $)']]
            ))
            fig_monthly.update_layout(
                title="Monthly Net P&L",
                xaxis_title="Month",
                yaxis_title="Net P&L ($)",
                height=400
            )
            st.plotly_chart(fig_monthly, use_container_width=True)

# Footer
st.markdown("---")
st.markdown("### 📝 How to Use:")
st.markdown("""
1. **Add entries** using the sidebar form (Date, Gain, Loss, W/D)
2. **View metrics** in the Dashboard tab
3. **Analyze data** in Daily/Monthly tabs
4. **Visualize trends** in Charts tab
5. **Export data** anytime using the Download button
6. **Import data** from your existing Excel/CSV files

**Note:** All calculations are automatic based on your Excel formulas!
""")
