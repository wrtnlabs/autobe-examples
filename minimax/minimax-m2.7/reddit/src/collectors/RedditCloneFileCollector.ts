import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace RedditCloneFileCollector {
  /**
   * Collects file upload data for reddit_clone_files table.
   * Handles metadata extraction and uploader relationship.
   */
  export async function collect(props: {
    body: IRedditCloneFile.ICreate;
    redditCloneMembers: IEntity;
  }) {
    const id: string = v4();
    const now: Date = new Date();
    // Extract file extension from original filename
    const originalExt = props.body.originalFilename.split(".").pop() ?? "";
    const extension = originalExt ? `.${originalExt}` : "";
    // Generate unique stored filename
    const storedFilename = `${v4()}${extension}`;
    // Generate storage path organized by year/month
    const year = now.getFullYear().toString();
    const month = (now.getMonth() + 1).toString().padStart(2, "0");
    const storagePath = `uploads/${year}/${month}/`;
    // Calculate file size from binary content
    const fileSize = new TextEncoder().encode(props.body.file).length;
    return {
      // Scalar fields
      id,
      original_filename: props.body.originalFilename,
      stored_filename: storedFilename,
      mime_type: "application/octet-stream",
      file_size: fileSize,
      storage_path: storagePath,
      status: "pending",
      created_at: now,
      updated_at: now,
      deleted_at: null,
      // BelongsTo relation
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