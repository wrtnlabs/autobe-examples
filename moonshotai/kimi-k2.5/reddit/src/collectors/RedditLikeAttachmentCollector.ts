import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace RedditLikeAttachmentCollector {
  export interface IInfrastructureResult {
    storagePath: string;
    mimeType: string;
    fileSizeBytes: number;
    checksumSha256: string;
  }
  export async function collect(props: {
    body: IRedditLikeAttachment.ICreate;
    redditLikeMembers: IEntity;
    infrastructure: IInfrastructureResult;
  }) {
    const id: string = v4();
    return {
      id,
      storage_path: props.infrastructure.storagePath,
      original_filename: props.body.originalFilename,
      mime_type: props.infrastructure.mimeType,
      file_size_bytes: props.infrastructure.fileSizeBytes,
      checksum_sha256: props.infrastructure.checksumSha256,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      uploadedByMember: { connect: { id: props.redditLikeMembers.id } },
    } satisfies Prisma.reddit_like_attachmentsCreateInput;
  }
}
