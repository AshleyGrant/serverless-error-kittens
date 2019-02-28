export interface KittenInfo {
  PartitionKey: "ImageInfo",
  RowKey: string,
  uri : string,
  blobName : string,
  tags : any[],
  description : string,
  metadata : any,
  isACat: number,
  isSFW: boolean,
}
