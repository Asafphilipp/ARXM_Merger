#  ARXML Merger Tool

**Professional AUTOSAR XML File Merger for Automotive Development**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/Version-2.0.0-blue.svg)](https://github.com/Asafphilipp/ARXM_Merger)
[![CANape Compatible](https://img.shields.io/badge/CANape-Compatible-green.svg)](https://www.vector.com/int/en/products/products-a-z/software/canape/)
[![CANoe Compatible](https://img.shields.io/badge/CANoe-Compatible-green.svg)](https://www.vector.com/int/en/products/products-a-z/software/canoe/)

## 🎯 Overview

The ARXML Merger Tool is a professional-grade web application designed for automotive engineers working with AUTOSAR XML files. It provides **100% lossless merging** of multiple XML files while maintaining full compatibility with Vector tools (CANape/CANoe).

### ✨ Key Features

- ** Fully Automatic Operation** - No configuration needed, just drag & drop
- ** Real-time Statistics** - Live preview of signals, clusters, and networks
- ** High Performance** - Handles large files and hundreds of files
- ** Complete Network Support** - CAN, CAN-FD, Ethernet VLAN, FlexRay, LIN
- **🛡 100% Signal Preservation** - No data loss guaranteed
- ** Vector Tools Ready** - CANape/CANoe compatible output

##  Quick Start

1. **Open the Tool**: Open `index.html` in your web browser
2. **Add Files**: Drag & drop your XML files or click to select
3. **Auto-Merge**: Tool automatically starts merging when files are added
4. **Download**: Merged files are automatically downloaded

**That's it!** No configuration, no complex settings - just works.

##  Automotive Features

###  Network Support
- **CAN Clusters** with baudrate detection
- **CAN-FD Clusters** with FD-baudrate support  
- **Ethernet Clusters** with VLAN configuration
- **FlexRay Clusters** fully supported
- **LIN Clusters** complete implementation

###  Signal Handling
- **I-SIGNAL** elements with length and init values
- **I-SIGNAL-GROUP** structures preserved
- **I-PDU** (Protocol Data Units) lossless merging
- **FRAME** elements (CAN/Ethernet/FlexRay/LIN)

###  Vector Tools Compatibility
- **CANape Ready**: All signals have correct LENGTH attributes
- **CANoe Ready**: Proper cluster configurations and baudraten
- **FIBEX Structure**: Maintained for Vector tool recognition
- **Network Endpoints**: Communication connectors preserved

##  Live Statistics Dashboard

```
 AUTOMOTIVE OVERVIEW
Signals: XXX | 


🔧 VECTOR TOOLS COMPATIBILITY:
• CANape: ✅ Ready
• CANoe: ✅ Ready
```

##  Performance Features

- **Parallel Processing**: Up to 4 files simultaneously
- **Memory Streaming**: For large files
- **Chunked Processing**: Prevents memory overflow
- **Auto Garbage Collection**: Optimized memory management

##  Cool Features

###  Keyboard Shortcuts
- `Ctrl+O` → Open files
- `Ctrl+Enter` → Start merge
- `Ctrl+S` → Download merged file
- `Esc` → Clear all files

###  Copy & Paste Support
- Copy files from Windows Explorer
- Paste directly into the tool
- Automatic XML file detection

###  Batch Processing
- **Folder Processing**: Process entire project folders
- **Recursive Search**: Finds all XML files automatically
- **Multi-Project Support**: Handle multiple projects at once

## 🔧 Technical Specifications

### Supported File Types
- `.arxml` (AUTOSAR XML files)
- `.xml` (Generic XML files with AUTOSAR structure)

### Browser Compatibility
- Chrome 90+ (Recommended)
- Firefox 88+
- Edge 90+
- Safari 14+

### File Size Limits
- **Single File**: Up to 2GB
- **Total Project**: Up to 10GB
- **File Count**: Unlimited

## 🛠️ Installation

### Option 1: Direct Use
1. Download or clone this repository
2. Open `index.html` in your web browser
3. Start merging files immediately

### Option 2: Local Server
```bash
# Clone the repository
git clone https://github.com/Asafphilipp/ARXM_Merger.git
cd ARXM_Merger

# Start local server (optional)
python -m http.server 8000
# Open http://localhost:8000
```

## 📖 Usage Examples

### Basic Merge
```
1. Drag 2-3 XML files into the tool
2. Watch live statistics update
3. Tool automatically merges and downloads result
```

### Large Project Merge
```
1. Click "📁 Folder Processing" 
2. Select project folder
3. Tool finds all XML files recursively
4. Automatic batch processing
5. Download merged result
```

## 🔍 Intelligent Features

### Smart Conflict Resolution
- **Signals**: Always merge (never lose signals!)
- **Clusters**: Intelligent configuration merging
- **FIBEX**: Critical for Vector tools - always preserved
- **Frames/PDUs**: Complete communication preservation

### Auto-Generated Filenames
```
Project_merged_3files_20250630T123456.arxml
```
- Based on input file patterns
- Includes file count and timestamp
- Automatic collision avoidance

## 📋 Output Files

### Merged XML
- Complete merged AUTOSAR file
- Vector tools compatible
- All signals and networks preserved

### Reports (Optional)
- **Merge Report**: Detailed merge statistics
- **Validation Report**: Compatibility checks
- **Conflict Log**: Resolution details

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Issues**: [GitHub Issues](https://github.com/Asafphilipp/ARXM_Merger/issues)
- **Documentation**: [Wiki](https://github.com/Asafphilipp/ARXM_Merger/wiki)

## 🏆 Acknowledgments

- Built for automotive engineers by automotive engineers
- Optimized for Vector CANape/CANoe workflows
- Tested with real-world AUTOSAR projects

---

**Made with ❤️ for the Automotive Industry**

## ⚠️ Security Notice

This tool is designed to handle automotive XML files. Please ensure that:
- No confidential or proprietary data is included in public repositories
- All example files are anonymized
- Company-specific network names and configurations are not exposed
