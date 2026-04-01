import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace RedditLikeAttachmentCollector {
  export interface IFileProcessedData {
    storagePath: string;
    mimeType: string;
    fileSizeBytes: number;
    checksumSha256: string;
  }
  export async function collect(props: {
    body: IRedditLikeAttachment.ICreate;
    redditLikeMembers: IEntity;
    fileData: IFileProcessedData;
  }) {
    const now = new Date();
    return {
      id: v4(),
      storage_path: props.fileData.storagePath,
      original_filename: props.body.originalFilename,
      mime_type: props.fileData.mimeType,
      file_size_bytes: props.fileData.fileSizeBytes,
      checksum_sha256: props.fileData.checksumSha256,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      uploadedByMember: {
        connect: {
          id: props.redditLikeMembers.id,
        },
      },
    } satisfies Prisma.reddit_like_attachmentsCreateInput;
  }
}
