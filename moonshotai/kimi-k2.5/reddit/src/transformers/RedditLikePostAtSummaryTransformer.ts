import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditLikeCommunityAtSummaryTransformer } from "./RedditLikeCommunityAtSummaryTransformer";
import { RedditLikeMemberAtSummaryTransformer } from "./RedditLikeMemberAtSummaryTransformer";

export namespace RedditLikePostAtSummaryTransformer {
  export type Payload = Prisma.reddit_like_postsGetPayload<
    ReturnType<typeof select>
  >;
  export async function transform(
    input: Payload,
  ): Promise<IRedditLikePost.ISummary> {
    return {
      id: input.id,
      title: input.title,
      post_type: input.post_type as "text" | "link" | "image",
      vote_score: input.vote_score,
      comment_count: input.comment_count,
      created_at: input.created_at.toISOString(),
      author: await RedditLikeMemberAtSummaryTransformer.transform(
        input.author,
      ),
      community: await RedditLikeCommunityAtSummaryTransformer.transform(
        input.community,
      ),
      text_excerpt: input.textContent?.excerpt ?? null,
      link_domain: input.linkContent?.domain ?? null,
      image_thumbnail_id: input.imageContent?.thumbnail_attachment_id ?? null,
    };
  }
  export function select() {
    return {
      select: {
        id: true,
        title: true,
        post_type: true,
        vote_score: true,
        comment_count: true,
        created_at: true,
        author: RedditLikeMemberAtSummaryTransformer.select(),
        community: RedditLikeCommunityAtSummaryTransformer.select(),
        textContent: {
          select: {
            excerpt: true,
          },
        } satisfies Prisma.reddit_like_post_text_contentsFindManyArgs,
        linkContent: {
          select: {
            domain: true,
          },
        } satisfies Prisma.reddit_like_post_link_contentsFindManyArgs,
        imageContent: {
          select: {
            thumbnail_attachment_id: true,
          },
        } satisfies Prisma.reddit_like_post_image_contentsFindManyArgs,
      },
    } satisfies Prisma.reddit_like_postsFindManyArgs;
  }
}
