import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeAttachmentThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachmentThumbnail";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditLikeAttachmentThumbnailAtSummaryTransformer {
  export type Payload = Prisma.reddit_like_attachment_thumbnailsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        width: true,
        height: true,
        quality: true,
        format: true,
        storage_path: true,
        file_size: true,
        created_at: true,
      },
    } satisfies Prisma.reddit_like_attachment_thumbnailsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditLikeAttachmentThumbnail.ISummary> {
    return {
      id: input.id,
      width: input.width,
      height: input.height,
      quality: input.quality,
      format: input.format,
      storagePath: input.storage_path,
      fileSize: input.file_size,
      createdAt: input.created_at.toISOString(),
    };
  }
}
