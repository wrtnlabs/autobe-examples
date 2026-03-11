import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostEngagementStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostEngagementStat";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_post_engagement_stats_success(
  connection: api.IConnection,
): Promise<void> {
  // Generate a valid post ID for testing
  const postId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Retrieve engagement statistics for the post
  // No authentication required based on @x-autobe-authorization-type null
  const stats = await api.functional.redditPlatform.posts.stats(connection, {
    postId,
  });
  typia.assert(stats);
  // Validate engagement statistics structure
  TestValidator.equals(
    "stats id is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      stats.id,
    ),
    true,
  );
  TestValidator.predicate(
    "view_count is non-negative integer",
    stats.view_count >= 0,
  );
  TestValidator.predicate(
    "upvote_count is non-negative integer",
    stats.upvote_count >= 0,
  );
  TestValidator.predicate(
    "downvote_count is non-negative integer",
    stats.downvote_count >= 0,
  );
  // Validate timestamp formats (ISO 8601 date-time)
  TestValidator.equals(
    "last_viewed_at is valid ISO 8601",
    !isNaN(Date.parse(stats.last_viewed_at)),
    true,
  );
  TestValidator.equals(
    "created_at is valid ISO 8601",
    !isNaN(Date.parse(stats.created_at)),
    true,
  );
  TestValidator.equals(
    "updated_at is valid ISO 8601",
    !isNaN(Date.parse(stats.updated_at)),
    true,
  );
  // Validate post reference data
  TestValidator.equals(
    "post id in reference matches request",
    stats.post.id,
    postId,
  );
  TestValidator.predicate("post title exists", stats.post.title.length > 0);
  TestValidator.equals(
    "post type is valid",
    ["TEXT", "LINK", "IMAGE"].includes(stats.post.post_type),
    true,
  );
  TestValidator.predicate(
    "vote_score is integer",
    Number.isInteger(stats.post.vote_score),
  );
  TestValidator.predicate(
    "comment_count is non-negative",
    stats.post.comment_count >= 0,
  );
  // Validate author reference
  TestValidator.equals(
    "author id is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      stats.post.author.id,
    ),
    true,
  );
  TestValidator.equals(
    "author username exists",
    stats.post.author.username.length > 0,
    true,
  );
  TestValidator.equals(
    "author display_name exists",
    stats.post.author.display_name.length > 0,
    true,
  );
  TestValidator.predicate(
    "author karma is integer",
    Number.isInteger(stats.post.author.karma_score),
  );
  TestValidator.predicate(
    "author is active",
    typeof stats.post.author.is_active === "boolean",
  );
  TestValidator.equals(
    "author created_at is valid ISO 8601",
    !isNaN(Date.parse(stats.post.author.created_at)),
    true,
  );
  // Validate community reference
  TestValidator.equals(
    "community id is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      stats.post.community.id,
    ),
    true,
  );
  TestValidator.equals(
    "community name exists",
    stats.post.community.name.length > 0,
    true,
  );
  TestValidator.predicate(
    "subscriber_count is non-negative",
    stats.post.community.subscriber_count >= 0,
  );
  TestValidator.equals(
    "community created_at is valid ISO 8601",
    !isNaN(Date.parse(stats.post.community.created_at)),
    true,
  );
  TestValidator.equals(
    "community owner id is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      stats.post.community.owner.id,
    ),
    true,
  );
  TestValidator.equals(
    "community owner username exists",
    stats.post.community.owner.username.length > 0,
    true,
  );
}
