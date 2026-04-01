import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { IRedditLikePostImageContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostImageContent";
import { IRedditLikePostLinkContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostLinkContent";
import { IRedditLikePostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostSnapshot";
import { IRedditLikePostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostTextContent";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditLikePostImageContentTransformer } from "./RedditLikePostImageContentTransformer";
import { RedditLikePostLinkContentTransformer } from "./RedditLikePostLinkContentTransformer";
import { RedditLikePostTextContentTransformer } from "./RedditLikePostTextContentTransformer";

export namespace RedditLikePostSnapshotTransformer {
  export type Payload = Prisma.reddit_like_post_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export async function transform(
    input: Payload,
  ): Promise<IRedditLikePostSnapshot> {
    return {
      id: input.id,
      postId: input.reddit_like_post_id,
      title: input.title,
      textContent: input.textContent
        ? await RedditLikePostTextContentTransformer.transform(
            input.textContent,
          )
        : null,
      linkContent: input.linkContent
        ? await RedditLikePostLinkContentTransformer.transform(
            input.linkContent,
          )
        : null,
      imageContents: input.imageContent
        ? [
            await RedditLikePostImageContentTransformer.transform(
              input.imageContent,
            ),
          ]
        : null,
      createdAt: input.created_at.toISOString(),
      deletedAt: input.is_deleted ? input.created_at.toISOString() : null,
    };
  }
  export function select() {
    return {
      select: {
        id: true,
        reddit_like_post_id: true,
        title: true,
        content_type: true,
        author_id: true,
        community_id: true,
        vote_score: true,
        comment_count: true,
        is_deleted: true,
        created_at: true,
        textContent: {
          select: RedditLikePostTextContentTransformer.select().select,
        } satisfies Prisma.reddit_like_post_text_contentsFindManyArgs,
        linkContent: {
          select: RedditLikePostLinkContentTransformer.select().select,
        } satisfies Prisma.reddit_like_post_link_contentsFindManyArgs,
        imageContent: {
          select: RedditLikePostImageContentTransformer.select().select,
        } satisfies Prisma.reddit_like_post_image_contentsFindManyArgs,
      },
    } satisfies Prisma.reddit_like_post_snapshotsFindManyArgs;
  }
}
