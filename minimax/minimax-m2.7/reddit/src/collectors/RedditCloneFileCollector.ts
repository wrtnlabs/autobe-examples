import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace RedditCloneFileCollector {
  export async function collect(props: {
    body: IRedditCloneFile.ICreate;
    redditCloneMembers: IEntity;
  }) {
    const id: string = v4();
    // Decode base64 file_data to compute file_size
    const fileBuffer: Buffer = Buffer.from(props.body.file_data, "base64");
    const fileSize: number = fileBuffer.length;
    // Generate unique stored filename with extension
    const fileExtension: string = getExtensionFromMimeType(
      props.body.mime_type,
    );
    const storedFilename: string = `${id}${fileExtension}`;
    // Generate storage path
    const storagePath: string = `files/${storedFilename}`;
    return {
      // Scalar fields
      id,
      original_filename: props.body.original_filename,
      stored_filename: storedFilename,
      mime_type: props.body.mime_type,
      file_size: fileSize,
      storage_path: storagePath,
      status: "pending",
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      // BelongsTo relation - connect to uploader from authorized actor
      uploader: { connect: { id: props.redditCloneMembers.id } },
      // HasMany/HasOne relations - not needed (created from parent side)
      communityIcons: undefined,
      postImages: undefined,
      scans: undefined,
      thumbnails: undefined,
      fileAssociation: undefined,
    } satisfies Prisma.reddit_clone_filesCreateInput;
  }
}
function getExtensionFromMimeType(mimeType: string): string {
  const mimeToExt: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/gif": ".gif",
    "image/webp": ".webp",
  };
  return mimeToExt[mimeType] ?? "";
}
