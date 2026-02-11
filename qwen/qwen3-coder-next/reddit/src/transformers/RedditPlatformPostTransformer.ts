import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditPlatformCommunityAtSummaryTransformer } from "./RedditPlatformCommunityAtSummaryTransformer";
import { RedditPlatformMemberAtSummaryTransformer } from "./RedditPlatformMemberAtSummaryTransformer";

export namespace RedditPlatformPostTransformer {
  // 1. Payload type first
  export type Payload = Prisma.reddit_platform_postsGetPayload<
    ReturnType<typeof select>
  >;
  // 2. select() function second
  export function select() {
    return {
      select: {
        id: true,
        title: true,
        type: true,
        content: true,
        url: true,
        image_url: true,
        vote_score: true,
        comment_count: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        author: RedditPlatformMemberAtSummaryTransformer.select(),
        community: RedditPlatformCommunityAtSummaryTransformer.select(),
        reddit_platform_comments: { select: { id: true } },
        reddit_platform_post_votes: { select: { id: true } },
        reddit_platform_feed_results: { select: { id: true } },
        reddit_platform_hot_score_caches: { select: { id: true } },
      },
    } satisfies Prisma.reddit_platform_postsFindManyArgs;
  }
  // 3. transform() function last
  export async function transform(
    input: Payload,
  ): Promise<IRedditPlatformPost> {
    return {
      id: input.id,
      title: input.title,
      type: input.type as "TEXT" | "LINK" | "IMAGE",
      content: input.content,
      url: input.url,
      imageUrl: input.image_url,
      voteScore: input.vote_score,
      commentCount: input.comment_count,
      author: await RedditPlatformMemberAtSummaryTransformer.transform(
        input.author,
      ),
      community: await RedditPlatformCommunityAtSummaryTransformer.transform(
        input.community,
      ),
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at ? input.deleted_at.toISOString() : null,
    };
  }
}
