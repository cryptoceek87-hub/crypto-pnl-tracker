# 💰 Crypto Trading P&L Tracker

A professional web-based Profit & Loss tracker for cryptocurrency trading with automatic calculations, visualizations, and cloud deployment.

## ✨ Features

- ✅ **Automatic Calculations** - All Excel formulas implemented
- ✅ **Daily & Monthly Views** - Track both daily trades and monthly summaries
- ✅ **Beautiful Charts** - Interactive visualizations with Plotly
- ✅ **Import/Export** - Excel and CSV support
- ✅ **Cloud-Based** - Access from anywhere
- ✅ **Free Forever** - 100% free hosting on Streamlit Cloud
- ✅ **Responsive Design** - Works on mobile, tablet, and desktop

## 📊 What It Tracks

### Daily Data
- Date
- Gains (in $)
- Losses (in $)
- Withdrawals/Deposits (in $)

### Automatic Calculations
- Cumulative Gains/Losses
- Daily Net P&L
- Cumulative Net P&L
- Cumulative W/D in $ and ₹
- Current Balance

### Monthly Summary
- Automatic aggregation of daily data
- All cumulative metrics

## 🚀 Quick Start (Local Testing)

### Step 1: Install Python
Make sure you have Python 3.8 or higher installed.
Check by running:
```bash
python --version
```

### Step 2: Install Dependencies
```bash
pip install -r requirements.txt
```

### Step 3: Run the App
```bash
streamlit run app.py
```

The app will open in your browser at `http://localhost:8501`

## ☁️ FREE CLOUD DEPLOYMENT (Recommended)

### Option 1: Streamlit Cloud (EASIEST - 5 Minutes)

#### Step 1: Create a GitHub Account
1. Go to https://github.com
2. Click "Sign up" (if you don't have an account)
3. It's 100% FREE

#### Step 2: Upload Your Files to GitHub

**Method A: Using GitHub Website (No coding needed)**
1. Go to https://github.com
2. Click the "+" icon in top right → "New repository"
3. Name it: `crypto-pnl-tracker`
4. Make it "Public"
5. Click "Create repository"
6. Click "uploading an existing file"
7. Upload these 3 files:
   - `app.py`
   - `requirements.txt`
   - `README.md`
8. Click "Commit changes"

**Method B: Using Git (If you know Git)**
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/crypto-pnl-tracker.git
git push -u origin main
```

#### Step 3: Deploy on Streamlit Cloud
1. Go to https://share.streamlit.io
2. Click "Sign in with GitHub"
3. Authorize Streamlit
4. Click "New app"
5. Select your repository: `crypto-pnl-tracker`
6. Main file path: `app.py`
7. Click "Deploy!"

**🎉 Done! You'll get a FREE URL like:**
`https://your-username-crypto-pnl-tracker.streamlit.app`

You can share this link with anyone!

### Option 2: Heroku (Alternative)

#### Step 1: Create Heroku Account
1. Go to https://heroku.com
2. Sign up for free

#### Step 2: Install Heroku CLI
Download from: https://devcenter.heroku.com/articles/heroku-cli

#### Step 3: Deploy
```bash
# Login to Heroku
heroku login

# Create new app
heroku create your-pnl-tracker

# Deploy
git push heroku main

# Open your app
heroku open
```

## 📱 How to Use the App

### Adding Entries
1. Open the app
2. Use the sidebar on the left
3. Fill in the form:
   - **Date**: Select trading date
   - **Gain**: Enter profit in $
   - **Loss**: Enter loss in $
   - **W/D**: Enter withdrawal (positive) or deposit (negative)
4. Click "Add Entry"

### Viewing Data
- **Dashboard**: See key metrics and recent entries
- **Daily View**: Full daily records with filters
- **Monthly View**: Monthly aggregated data
- **Charts**: Visual analysis of your performance

### Import/Export
- **Import**: Upload your existing Excel file (must have DateWise sheet)
- **Export**: Download complete data with both sheets

## 🔧 Customization

### Change Exchange Rate
1. Open the sidebar
2. Find "Exchange Rate (₹/$)"
3. Update the value (default is 80)

### Modify Colors/Theme
Edit `app.py` and modify the Plotly chart colors:
```python
line=dict(color='#00CC96', width=3)  # Change color here
```

## 📋 File Structure

```
crypto-pnl-tracker/
│
├── app.py              # Main application file
├── requirements.txt    # Python dependencies
└── README.md          # This file
```

## 🔒 Data Security

- Your data is stored in your browser session
- No data is sent to external servers (except Streamlit Cloud if deployed)
- Export your data regularly as backup
- For sensitive data, run locally only

## 🆘 Troubleshooting

### App won't start locally?
```bash
# Reinstall dependencies
pip install --upgrade -r requirements.txt

# Try running with explicit python3
python3 -m streamlit run app.py
```

### Deployment failed?
- Make sure all 3 files are in the repository
- Check file names are exact (case-sensitive)
- Verify requirements.txt has no errors
- Check Streamlit Cloud logs for errors

### Import not working?
- Ensure Excel has "DateWise" sheet
- Check column names match exactly
- Required columns: Date, Gain(in $), Loss(in $), W/D(in $)

## 💡 Tips

1. **Regular Backups**: Download Excel weekly
2. **Mobile Access**: Bookmark the URL on your phone
3. **Multiple Devices**: Use the cloud version for sync across devices
4. **Currency**: You can track any currency, just update labels
5. **Sharing**: Share the URL with your team/partners

## 🎯 Excel Formula Implementation

All your Excel formulas are automatically implemented:

### DateWise Sheet
- `Cgain(in$)` = Cumulative sum of Gain
- `Closs(in$)` = Cumulative sum of Loss
- `Net(in $)` = Gain - Loss
- `Cum(in $)` = Cumulative Net P&L
- `CWD(in$)` = Cumulative W/D
- `CWD(inR)` = CWD × Exchange Rate
- `Balance($)` = Cumulative P&L - Cumulative W/D

### Monthwise Sheet
- Automatic aggregation by month
- All cumulative calculations
- Month-over-month tracking

## 📞 Support

Having issues? Check:
1. Python version (must be 3.8+)
2. All dependencies installed
3. File names are correct
4. GitHub repository is public

## 📄 License

Free to use and modify for personal/commercial use.

## 🌟 Next Steps After Deployment

1. **Bookmark Your URL** - Save it for quick access
2. **Add to Home Screen** - On mobile, works like an app
3. **Import Your Data** - Upload your existing Excel file
4. **Start Tracking** - Add daily entries
5. **Monitor Progress** - Check charts regularly

---

**Enjoy your FREE cloud-based P&L tracker! 🚀**

Questions? The app includes built-in help in the interface.
