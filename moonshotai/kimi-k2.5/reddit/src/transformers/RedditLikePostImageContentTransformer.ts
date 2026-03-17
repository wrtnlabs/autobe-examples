import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { IRedditLikePostImageContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostImageContent";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditLikeAttachmentAtSummaryTransformer } from "./RedditLikeAttachmentAtSummaryTransformer";

export namespace RedditLikePostImageContentTransformer {
  export type Payload = Prisma.reddit_like_post_image_contentsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        thumbnail_generated: true,
        created_at: true,
        updated_at: true,
        attachment: RedditLikeAttachmentAtSummaryTransformer.select(),
        thumbnailAttachment: RedditLikeAttachmentAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_like_post_image_contentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditLikePostImageContent> {
    return {
      id: input.id,
      attachment: await RedditLikeAttachmentAtSummaryTransformer.transform(
        input.attachment,
      ),
      thumbnail: input.thumbnailAttachment
        ? await RedditLikeAttachmentAtSummaryTransformer.transform(
            input.thumbnailAttachment,
          )
        : null,
      thumbnailGenerated: input.thumbnail_generated,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
    };
  }
}
