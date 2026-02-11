import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformFeedResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformFeedResult";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditPlatformFeedResultTransformer {
  export type Payload = Prisma.reddit_platform_feed_resultsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        feedPreference: { select: { id: true } },
        post: { select: { id: true } },
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
      },
    } satisfies Prisma.reddit_platform_feed_resultsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditPlatformFeedResult> {
    return {
      id: input.id,
      feed_preference_id: input.feedPreference.id,
      post_id: input.post.id,
      post_title: input.post_title,
      post_content: input.post_content ?? undefined,
      author_username: input.author_username,
      community_name: input.community_name,
      post_type: input.post_type,
      vote_score: input.vote_score,
      comment_count: input.comment_count,
      post_created_at: toISOStringSafe(input.post_created_at),
      cached_at: toISOStringSafe(input.cached_at),
      ttl_seconds: input.ttl_seconds,
      is_active: input.is_active,
      created_at: toISOStringSafe(input.created_at),
    };
  }
}
