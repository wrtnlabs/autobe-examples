import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformFeedResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformFeedResult";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditPlatformFeedResultAtSummaryTransformer {
  export type Payload = Prisma.reddit_platform_feed_resultsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        post_title: true,
        post_content: true,
        author_username: true,
        community_name: true,
        post_type: true,
        vote_score: true,
        comment_count: true,
        post_created_at: true,
        cached_at: true,
        ttl_seconds: true,
        is_active: true,
        created_at: true,
        feedPreference: true,
        post: true,
      },
    } satisfies Prisma.reddit_platform_feed_resultsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditPlatformFeedResult.ISummary> {
    return {
      id: input.id,
      postId: input.id,
      postTitle: input.post_title,
      postType: input.post_type,
      voteScore: input.vote_score,
      commentCount: input.comment_count,
      postCreatedAt: toISOStringSafe(input.post_created_at),
      authorUsername: input.author_username,
      communityName: input.community_name,
    };
  }
}
