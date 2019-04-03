import * as signalR from '@aspnet/signalr';
import environment from './environment';
import { autoinject } from 'aurelia-framework';
import { HttpClient } from 'aurelia-fetch-client';

@autoinject()
export class Home {
  kittens = [];
  logEntries = [];
  panelType = 'default';
  uploadText = 'Drop kittens here for upload';
  status = 'Disconnected';
  connection: signalR.HubConnection;

  constructor(private http: HttpClient) { }

  activate() {
    this.loadRecentKittens();
    this.connect();
  }

  deactivate() {
    return this.disconnect();
  }

  async handleUpload({ dataTransfer: { files, items } }: DragEvent) {
    this.panelType = 'warning';

    const blobUrls: string[] = await (await this.http.fetch(`${environment.apiUrl}/generate-blob-url`, {
      method: 'POST',
      body: JSON.stringify({
        'container': 'uploads',
        'permissions': 'w',
        'count': files.length
      })
    })).json();

    this.uploadText = `Uploading ${files.length} files...`;

    await Promise.all(blobUrls.map(async (uploadUrl, i) => {
      const fileToUpload = files[i];

      console.log(`Uploading file: ${fileToUpload.name}`);

      try {
        await this.http.fetch(uploadUrl, {
          method: 'put',
          headers: {
            'x-ms-blob-type': 'BlockBlob'
          },
          body: fileToUpload
        });
      } catch (error) {
        console.error('Upload error', error);
      }
    }));

    this.uploadText = `Finished uploading ${files.length} kittens...`;

    setTimeout(() => {
      this.uploadText = 'Drop kittens here for upload';
      this.panelType = 'default';
    }, 5000);
  }

  async loadRecentKittens() {
    this.kittens = await (await this.http.fetch(`${environment.apiUrl}/recent`)).json();
  }

  async connect() {
    this.disconnect();
    const { accessToken, url } = await (await this.http.fetch(`${environment.apiUrl}/negotiate`)).json();

    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(url, {
        accessTokenFactory: () => accessToken
      })
      .configureLogging(signalR.LogLevel.Information)
      .build();

      this.connection.on(environment.newKittenMessage, (uri, description) => {
        console.log('New kitten', uri, description);
        this.kittens.unshift({ uri, description });
      });

      this.connection.on(environment.newInfoMessage, (logEntry) => {
        this.logEntries.unshift(logEntry);
      });

    this.connection.onclose(() => this.status = 'Disconnected');

    await this.connection.start();

    this.status = 'Connected';
  }

  disconnect() {
    if (this.connection) {
      this.connection.stop();
    }

    this.connection = null;
  }
}

export class LimitValueConverter {
  toView(value: any[], count = 10) {
    if (value && value.length > 0) {
      return value.slice(0, count);
    }
  }
}
