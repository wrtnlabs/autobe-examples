import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { IRedditLikePostImageContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostImageContent";
import { IRedditLikePostLinkContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostLinkContent";
import { IRedditLikePostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostSnapshot";
import { IRedditLikePostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostTextContent";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditLikePostImageContentTransformer } from "./RedditLikePostImageContentTransformer";
import { RedditLikePostLinkContentTransformer } from "./RedditLikePostLinkContentTransformer";
import { RedditLikePostTextContentTransformer } from "./RedditLikePostTextContentTransformer";

export namespace RedditLikePostSnapshotTransformer {
  export type Payload = Prisma.reddit_like_post_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        title: true,
        content_type: true,
        author_id: true,
        community_id: true,
        vote_score: true,
        comment_count: true,
        is_deleted: true,
        created_at: true,
        post: {
          select: {
            id: true,
          },
        } satisfies Prisma.reddit_like_postsFindManyArgs,
        textContent: RedditLikePostTextContentTransformer.select(),
        linkContent: RedditLikePostLinkContentTransformer.select(),
        imageContent: RedditLikePostImageContentTransformer.select(),
      },
    } satisfies Prisma.reddit_like_post_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditLikePostSnapshot> {
    return {
      id: input.id,
      postId: input.post.id,
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
}
