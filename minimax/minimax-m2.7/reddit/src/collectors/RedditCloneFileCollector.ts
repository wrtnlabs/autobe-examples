import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace RedditCloneFileCollector {
  /**
   * Extract MIME type from base64 file content using magic bytes.
   */
  function extractMimeType(base64Content: string): string {
    const header = base64Content.substring(0, 50);
    if (header.startsWith("/9j/")) return "image/jpeg";
    if (header.startsWith("iVBOR")) return "image/png";
    if (header.startsWith("R0lGO")) return "image/gif";
    if (header.startsWith("UklGR")) return "image/webp";
    return "application/octet-stream";
  }
  /**
   * Get file extension from MIME type.
   */
  function getExtension(mimeType: string): string {
    const map: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/gif": "gif",
      "image/webp": "webp",
    };
    return map[mimeType] ?? "bin";
  }
  export async function collect(props: {
    body: IRedditCloneFile.ICreate;
    redditCloneMembers: IEntity;
    redditCloneMemberSessions: IEntity;
  }) {
    const id: string = v4();
    const mimeType: string = extractMimeType(props.body.file);
    const extension: string = getExtension(mimeType);
    const storedFilename: string = `${v4()}.${extension}`;
    const fileSize: number = Math.ceil((props.body.file.length - 22) * 3) / 4;
    return {
      id,
      original_filename: props.body.originalFilename,
      stored_filename: storedFilename,
      mime_type: mimeType,
      file_size: fileSize,
      storage_path: `/uploads/files/${storedFilename}`,
      status: "pending",
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      uploader: { connect: { id: props.redditCloneMembers.id } },
    } satisfies Prisma.reddit_clone_filesCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace RedditCloneFileCollector {
//         export async function collect(props: {
//           body: IRedditCloneFile.ICreate;
//           redditCloneMembers: IEntity; // from authorized actor
// redditCloneMemberSessions: IEntity; // from authorized session
//           
//           
//         }) {
//           return {
//       id: ...,
//       original_filename: ...,
//       stored_filename: ...,
//       mime_type: ...,
//       file_size: ...,
//       storage_path: ...,
//       status: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       uploader: ...,
//       communityIcons: ...,
//       postImages: ...,
//       scans: ...,
//       thumbnails: ...,
//       fileAssociation: ...,
//           } satisfies Prisma.reddit_clone_filesCreateInput;
//         }
//       }
//--------------------------------------------------------------