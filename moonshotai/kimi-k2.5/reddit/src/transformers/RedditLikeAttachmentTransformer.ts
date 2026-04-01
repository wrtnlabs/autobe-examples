import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditLikeMemberAtSummaryTransformer } from "./RedditLikeMemberAtSummaryTransformer";

export namespace RedditLikeAttachmentTransformer {
  export type Payload = Prisma.reddit_like_attachmentsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        storage_path: true,
        original_filename: true,
        mime_type: true,
        file_size_bytes: true,
        checksum_sha256: true,
        created_at: true,
        updated_at: true,
        uploadedByMember: RedditLikeMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_like_attachmentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditLikeAttachment> {
    return {
      id: input.id,
      uploader: await RedditLikeMemberAtSummaryTransformer.transform(
        input.uploadedByMember,
      ),
      storagePath: input.storage_path,
      originalFilename: input.original_filename,
      mimeType: input.mime_type,
      fileSizeBytes: input.file_size_bytes,
      checksumSha256: input.checksum_sha256,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
    };
  }
}
