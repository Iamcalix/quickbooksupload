# Deployment Guide - QuickBooks Upload Application

## 📦 Repository
**GitHub**: https://github.com/Iamcalix/quickbooksupload.git

---

## 🚀 Recommended Deployment: Vercel

### Step 1: Push to GitHub ✅
Your code is currently being pushed to GitHub.

### Step 2: Deploy to Vercel

1. **Go to Vercel**
   - Visit: https://vercel.com
   - Click "Sign Up" or "Login"
   - Choose "Continue with GitHub"

2. **Import Your Project**
   - Click "Add New..." → "Project"
   - Find `quickbooksupload` in your repository list
   - Click "Import"

3. **Configure Build Settings**
   Vercel will auto-detect these settings:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

4. **Configure Google Sheets URL (Optional)**
   
   The Google Sheets URL is hardcoded in the application:
   - File: `src/utils/customerMappingService.ts`
   - Current URL: `https://docs.google.com/spreadsheets/d/1UAsaVoPF4Vp2AakivI_qv7-dXfUqIXAIlKijYWG0KmA/export?format=csv`
   
   **Important**: Make sure your Google Sheet is set to "Anyone with the link can view"
   
   > **No environment variables needed!** The app works entirely client-side with Google Sheets.

5. **Deploy**
   - Click "Deploy"
   - Wait 2-3 minutes for build to complete
   - Your app will be live at: `https://quickbooksupload.vercel.app`

---

## 🔄 Automatic Deployments

Once connected to Vercel:
- Every push to `main` branch → Automatic deployment
- Pull requests → Preview deployments
- Rollback to previous versions anytime

---

## 🌐 Custom Domain (Optional)

1. In Vercel dashboard → Settings → Domains
2. Add your custom domain
3. Update DNS records as instructed
4. SSL certificate is automatic

---

## 📊 Post-Deployment Checklist

- [ ] Test transaction parsing with real data
- [ ] Verify Google Sheets customer mapping works
- [ ] Check Supabase connection
- [ ] Test Excel export functionality
- [ ] Verify QuickBooks format output (10 columns)
- [ ] Test on mobile devices

---

## 🔧 Troubleshooting

### Build Fails
- Check that all dependencies are in `package.json`
- Check build logs in Vercel dashboard
- Try building locally first: `npm run build`

### Google Sheets Not Loading
- **Verify sheet is publicly accessible**: Share → "Anyone with the link can view"
- **Check URL** in `src/utils/customerMappingService.ts`
- **Check browser console** for CORS or network errors
- **Test the CSV export URL** directly in browser

### Customer Names Not Populating
- Verify Member IDs in transactions match format: MC###XXX
- Check Google Sheet has correct column structure
- Clear browser cache (mappings are cached for 24 hours)
- Check browser console for mapping logs

---

## 📱 Alternative Deployment Options

### Option 2: Netlify
1. Go to https://netlify.com
2. Drag `dist` folder after running `npm run build`
3. Add environment variables in Site Settings

### Option 3: GitHub Pages
- Free but limited (static only)
- Requires additional configuration
- Not recommended for this project

---

## 🎯 Next Steps After Deployment

1. **Share the URL** with your team
2. **Monitor usage** in Vercel Analytics
3. **Set up alerts** for errors
4. **Create backups** of important data
5. **Document** any custom workflows

---

## 💡 Pro Tips

- Use Vercel's preview deployments to test changes before going live
- Set up a staging environment for testing
- Enable Vercel Analytics to track usage
- Use environment-specific variables for dev/prod

---

## 📞 Support

If you encounter issues:
1. Check Vercel deployment logs
2. Check browser console for errors
3. Verify all environment variables are set
4. Test locally first with `npm run dev`
