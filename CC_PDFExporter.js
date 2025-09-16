function PDFExporter() {
    const props = new PropertiesManager;
    const exp = new ExportManager;

    // MessageLog.clearLog();

    function getParentWidget() {
        var topWidgets = QApplication.topLevelWidgets();
        for (var i in topWidgets) {
            if (topWidgets[i] instanceof QMainWindow && !topWidgets[i].parentWidget()) {
                return topWidgets[i];
            }
        }

        return "";
    };
    
    function getIcon(filename) {
        var icon = specialFolders.resource + '/icons/' + filename;
        return icon;
    }

    function getProjectFilename() {
		var recentScenes = preferences.getString('RECENT_SCENES_LIST', '');

		if (recentScenes) {
			var firstScene = recentScenes.split("$")[0]; 
			var firstSceneFilename = firstScene.split("/").pop().replace('.sbpz', ''); 
			
			return firstSceneFilename

		} else {
			MessageLog.debug('No recent scenes found.');
		}
	}

    function ExportCompleteMessageBox(parent) {
        var self = this;

        self.messageBox = new QMessageBox(parent = parent);
        self.messageBox.icon = QMessageBox.Information;
        self.messageBox.text = "Export completed.";
            
        self.messageBox.addButton(QMessageBox.Ok);
        self.messageBox.addButton(QMessageBox.Close);
            
        var result = self.messageBox.exec()
        
        if (result == QMessageBox.Ok) {
            self.close();
        } else if (result == QMessageBox.Close) {
            parent.close();
        }
    }
    
    function ExportProgressDialog() {
        var self = this;

        self.dialog = new QDialog();
		self.dialog.setWindowTitle('Exporting...');
		self.dialog.setFixedSize(400, 80);
	
		var layout = new QVBoxLayout();
		layout.setSpacing(0);

		self.exportLabel = new QLabel('');
		self.progressBar = new QProgressBar();

        self.progressBar.setMinimum(0);
        self.progressBar.setMaximum(0);

        layout.addWidget(self.exportLabel, 0, 0);
		layout.addWidget(self.progressBar, 0, 0);
        self.dialog.setLayout(layout);
        self.dialog.modal = true;
        var flags = new Qt.WindowFlags(Qt.Dialog | Qt.WindowTitleHint | Qt.CustomizeWindowHint);
		self.dialog.setWindowFlags(flags);

        self.exportLabel.setSizePolicy(QSizePolicy.Minimum, QSizePolicy.Fixed);
		self.progressBar.setSizePolicy(QSizePolicy.Minimum, QSizePolicy.Fixed);

        self.dialog.show();

        self.updateProgress = function(status) {
            if (status == 'complete') {
                self.dialog.close();
            }
        }
    }
    
    function PdfExporterDialog(parent) {
        var self = this;
    
        _init_ui();
        _connect_ui();
        _load_settings();
    
        function _init_ui() {
            self.dialog = new QDialog(parent);
            self.dialog.setWindowTitle('PDF Exporter');
            self.dialog.modal = true;
            var mainLayout = new QVBoxLayout(self.widget);
            self.dialog.setLayout(mainLayout);
    
            var destinationPathGroup = new QGroupBox('Destination Path');
            var destinationPathLayout = new QVBoxLayout();
            var filePathLayout = new QHBoxLayout();
            self.filePathLineEdit = new QLineEdit();
            self.filePathToolButton = new QToolButton();
            self.filePathToolButton.icon = new QIcon(getIcon('file/open.svg'));
            self.filePathToolButton.setIconSize(new QSize(25,25));
            self.filePathToolButton.setStyleSheet('QToolButton{border: none;}')
    
            self.fileNameLabel = new QLabel('File Name');
            self.fileNameLineEdit = new QLineEdit();
            
            filePathLayout.addWidget(self.filePathLineEdit, 0, 0);
            filePathLayout.addWidget(self.filePathToolButton, 0, 0);
    
            destinationPathLayout.addLayout(filePathLayout, 0);
            destinationPathLayout.addSpacing(10);
            destinationPathLayout.addWidget(self.fileNameLabel, 0, 0);
            destinationPathLayout.addWidget(self.fileNameLineEdit, 0, 0);
    
            destinationPathLayout.setSpacing(0);
            destinationPathGroup.setLayout(destinationPathLayout);

            var pdfExportParametersGroup = new QGroupBox('PDF Export Parameters');
            var pdfProfilesLayout = new QHBoxLayout();
            self.profileLabel = new QLabel('PDF Profile');
            self.profileDropdown = new QComboBox();

            var pdfProfiles = exp.getPDFProfiles();

            self.profileDropdown.addItems(pdfProfiles);
            
            pdfProfilesLayout.addWidget(self.profileLabel, 0, 0);
            pdfProfilesLayout.addWidget(self.profileDropdown, 1, 0);
            pdfExportParametersGroup.setLayout(pdfProfilesLayout);
    
            var dialogButtonLayout = new QHBoxLayout();
            self.closeButton = new QPushButton('Close');
            self.exportButton = new QPushButton('Export');
    
            dialogButtonLayout.addSpacing(220);
            dialogButtonLayout.addWidget(self.closeButton, 0, 0);
            dialogButtonLayout.addWidget(self.exportButton, 0, 0);
    
            mainLayout.addWidget(destinationPathGroup, 0, 0);
            mainLayout.addWidget(pdfExportParametersGroup, 0, 0);
            mainLayout.addLayout(dialogButtonLayout);

            self.dialog.show();
        }
    
        function _connect_ui() {
            self.closeButton.clicked.connect(self, self.dialog.close);
            self.exportButton.clicked.connect(self, exportPdf);
            self.filePathToolButton.clicked.connect(self, openFileDialog);
            self.profileDropdown.currentIndexChanged.connect(self, saveSelectedProfile);
        }
    
        function _load_settings() {
            var prefFilePath = preferences.getString('CC_PDF_EXPORT_PATH', '');
            self.filePathLineEdit.setText(prefFilePath);
    
            var projectFilename = getProjectFilename();
            self.fileNameLineEdit.setText(projectFilename);
    
            var prefProfile = preferences.getString('CC_LAST_SELECTED_PDF_PROFILE', 'Full Page')
            var pdfProfiles = exp.getPDFProfiles();
            var prefProfileIndex = pdfProfiles.indexOf(prefProfile);
            self.profileDropdown.setCurrentIndex(prefProfileIndex);
        }

        function exportPdf() {
            preferences.setString('CC_PDF_EXPORT_PATH', self.filePathLineEdit.text);
            preferences.setString('CC_LAST_SELECTED_PDF_PROFILE', self.profileDropdown.currentText);
    
            props.setTitle(self.fileNameLineEdit.text);
            exp.setPDFProfile(self.profileDropdown.currentText);
        
            var pdfFilePath = self.filePathLineEdit.text + '/' + self.fileNameLineEdit.text + '.pdf';
            
            var progress = new ExportProgressDialog();
            progress.exportLabel.text = 'Exporting PDF --- ' + self.fileNameLineEdit.text
            exp.exportToPDF(pdfFilePath);
        
            progress.updateProgress('complete');

            ExportCompleteMessageBox(self.dialog)
        }        

        function openFileDialog() {
			var prefFilePath = preferences.getString('CC_PDF_EXPORT_PATH', '');
			var userPath = FileDialog.getExistingDirectory(prefFilePath, 'Go to folder');

			if (!userPath) return;

			preferences.setString('CC_PDF_EXPORT_PATH', userPath);
			self.filePathLineEdit.setText(userPath);
		}

        function saveSelectedProfile(index) {
            var selectedProfile = self.profileDropdown.itemText(index);
            preferences.setString('CC_LAST_SELECTED_PDF_PROFILE', selectedProfile);
        }
    }

    var parentWidget = getParentWidget();
	new PdfExporterDialog(parentWidget);
}
