/*
###########################################################################
#   A script that syncs selected playlists                                #
#                                                                         #
#   Copyright                                                             #
#   (C) 2018 Werner Fürst werner@für.st                                   #
#                                                                         #
#   This program is free software; you can redistribute it and/or modify  #
#   it under the terms of the GNU General Public License as published by  #
#   the Free Software Foundation; either version 2 of the License, or     #
#   (at your option) any later version.                                   #
#                                                                         #
#   This program is distributed in the hope that it will be useful,       #
#   but WITHOUT ANY WARRANTY; without even the implied warranty of        #
#   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the         #
#   GNU General Public License for more details.                          #
#                                                                         #
#   You should have received a copy of the GNU General Public License     #
#   along with this program; if not, write to the                         #
#   Free Software Foundation, Inc.,                                       #
#   51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.         #
###########################################################################
*/

Importer.loadQtBinding("qt.core");
Importer.loadQtBinding("qt.gui");
Importer.loadQtBinding("qt.uitools");

var playlist_ids=[];
var playlist_names=[];
var lastTracksDir="";
var lastPlaylistsDir="";
var lastm3uPrefix="";

exportSlot = function() {
    var list = this.dialog.musicGroupBox.listWidget;

    cntPlaylists = 0;
    cntPlaylistEntries = 0;
    list.selectionModel().selectedIndexes().forEach(function(entry) {
        plid = playlist_ids[entry.row()];

        try{


            plf = lastPlaylistsDir + "/" + playlist_names[entry.row()] + '.m3u';
            var pf = new QFile(plf);
            pf.open( QIODevice.WriteOnly );
        }catch(e){
            Amarok.alert(e+"Error opening m3u");
        };

        cntPlaylists++;

        entries = Amarok.CollectionManager.query("select devices.lastmountpoint,urls.rpath " +
                                    "from playlist_tracks p " +
                                    "left outer join urls on p.url=urls.uniqueid " +
                                    "left outer join devices on devices.id=urls.deviceid " +
                                    "where p.playlist_id = " + plid);

        var playlist_entries_devices = entries.filter(function(val,index){return ((index % 2)===0)});

        var playlist_entries_urls = entries.filter(function(val,index){return ((index % 2)===1)});

        for (var i = 0; i < playlist_entries_devices.length; i++) {

            try{
                trackfile = playlist_entries_devices [i] + playlist_entries_urls[i].substr(1);

                file = new QFile(trackfile);
                fileinfo = new QFileInfo(file);
                filename = fileinfo.fileName();
                path = fileinfo.path();
                newpath = lastTracksDir + path;

                dir = new QDir();
                dir.mkpath(newpath);

                filenew = newpath + "/" + filename;

                file.copy(filenew);

                pf.write(new QByteArray(lastm3uPrefix + trackfile + "\n"));

            }catch(e){
                Amarok.alert(e+"Error file...");
            }

            cntPlaylistEntries++;
        }

        pf.close();

    });

    status = Amarok.alert("Fertig\n"+cntPlaylists+" Playlist\n"+cntPlaylistEntries+" Einträge synchronisiert","warningContinueCancel");

    if (status == 2) this.dialog.close();

}

tracksSlot = function()
{
    Amarok.debug("-> Gui." + "browse");

    var tracksLine = this.dialog.syncGroupBox.tracksLine;
    var syncDir = QFileDialog.getExistingDirectory(null, "sync to dir", lastTracksDir);
    if (syncDir != "") {
	tracksLine.setText(syncDir);
        lastTracksDir=syncDir;
    }

    Amarok.debug("<- Gui." + "browse");
}

playlistsSlot = function()
{
    Amarok.debug("-> Gui." + "browse");

    var playlistsLine = this.dialog.syncGroupBox.playlistsLine;
    var syncDir = QFileDialog.getExistingDirectory(null, "playlists dir", lastPlaylistsDir);
    if (syncDir != "") {
	playlistsLine.setText(syncDir);
        lastPlaylistsDir=syncDir;
    }

    Amarok.debug("<- Gui." + "browse");
}

saveSlot = function()
{

    var tracksLine = this.dialog.syncGroupBox.tracksLine;
    lastTracksDir = tracksLine.text;
    Amarok.Script.writeConfig("syncplaylists.lastTracksDir",lastTracksDir);

    var playlistsLine = this.dialog.syncGroupBox.playlistsLine;
    lastPlaylistsDir = playlistsLine.text;
    Amarok.Script.writeConfig("syncplaylists.lastPlaylistsDir",lastPlaylistsDir);

    var m3uLine = this.dialog.syncGroupBox.m3uLine;
    lastm3uPrefix = m3uLine.text;
    Amarok.Script.writeConfig("syncplaylists.lastm3uPrefix",lastm3uPrefix);

}



cancelSlot = function()
{
    Amarok.debug("-> Gui." + "browse");

    this.dialog.close();

    Amarok.debug("<- Gui." + "browse");
}


makeCallback = function()
{
    Amarok.debug("-> Gui." + "show");

    lastTracksDir = Amarok.Script.readConfig("syncplaylists.lastTracksDir","/home/_not_set_");
    lastPlaylistsDir = Amarok.Script.readConfig("syncplaylists.lastPlaylistsDir","/home/_not_set_");
    lastm3uPrefix = Amarok.Script.readConfig("syncplaylists.lastm3uPrefix","../Music");
    var uiLoader = new QUiLoader(this);
    var uiFile = new QFile(Amarok.Info.scriptPath() + "/Play.ui");
    uiFile.open(QIODevice.ReadOnly);
    this.dialog = uiLoader.load(uiFile, this);

    var list = this.dialog.musicGroupBox.listWidget;

    var tracksLine = this.dialog.syncGroupBox.tracksLine;
    tracksLine.setText(lastTracksDir);
    var playlistsLine = this.dialog.syncGroupBox.playlistsLine;
    playlistsLine.setText(lastPlaylistsDir);
    var m3uLine = this.dialog.syncGroupBox.m3uLine;
    m3uLine.setText(lastm3uPrefix);

    result = Amarok.CollectionManager.query("select name,id from playlists");

    playlist_names = result.filter(function(val,index){return ((index % 2)===0)});

    playlist_ids = result.filter(function(val,index){return ((index % 2)===1)});

    list.addItems(playlist_names);

    this.dialog.buttonGroupBox.exportButton.clicked.connect(this, this.exportSlot);

    this.dialog.buttonGroupBox.cancelButton.clicked.connect(this, this.cancelSlot);

    this.dialog.syncGroupBox.tracksButton.clicked.connect(this, this.tracksSlot);

    this.dialog.syncGroupBox.playlistsButton.clicked.connect(this, this.playlistsSlot);

    this.dialog.syncGroupBox.saveButton.clicked.connect(this, this.saveSlot);

    this.dialog.show();

    Amarok.debug("<- Gui." + "show");
}

Amarok.Window.addToolsSeparator();
Amarok.Window.addToolsMenu("syncplaylists", "sync Selected Playlists", "icons/sunny");
Amarok.Window.ToolsMenu.syncplaylists['triggered()'].connect(Amarok.Window.ToolsMenu.syncplalists, function() { makeCallback(); } );

