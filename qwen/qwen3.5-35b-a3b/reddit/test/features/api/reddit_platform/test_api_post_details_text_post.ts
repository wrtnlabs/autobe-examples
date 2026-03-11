import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostEngagementStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostEngagementStat";
import type { IRedditPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostImage";
import type { IRedditPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostSnapshot";
import type { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_post_details_text_post(
  connection: api.IConnection,
): Promise<void> {
  // 1. Generate a valid UUID for testing
  const postId = typia.random<string & tags.Format<"uuid">>();
  // 2. Retrieve post details using the available GET endpoint
  // This will use the mock data generator if simulation is enabled,
  // or fetch actual data from the server
  const post = await api.functional.redditPlatform.posts.at(connection, {
    postId,
  });
  typia.assert(post);
  // 3. Validate post_type is TEXT for this test
  TestValidator.equals("post type is TEXT", post.post_type, "TEXT");
  // 4. Validate content field exists for TEXT posts
  TestValidator.notEquals("content exists", post.content, null);
  TestValidator.predicate(
    "content is string",
    typeof post.content === "string",
  );
  // 5. Validate url and image_url are null for TEXT posts
  TestValidator.equals("url is null", post.url, null);
  TestValidator.equals("image_url is null", post.image_url, null);
  // 6. Validate vote_score is valid int32
  TestValidator.equals(
    "vote_score is int32",
    Number.isInteger(post.vote_score),
    true,
  );
  TestValidator.predicate(
    "vote_score fits int32",
    post.vote_score >= -2147483648 && post.vote_score <= 2147483647,
  );
  // 7. Validate comment_count is valid int32
  TestValidator.equals(
    "comment_count is int32",
    Number.isInteger(post.comment_count),
    true,
  );
  TestValidator.predicate(
    "comment_count non-negative",
    post.comment_count >= 0,
  );
  // 8. Validate created_at is valid date-time format
  TestValidator.equals("created_at exists", post.created_at.length > 0, true);
  TestValidator.predicate(
    "created_at is valid date",
    !Number.isNaN(Date.parse(post.created_at)),
  );
  // 9. Validate updated_at is valid date-time format
  TestValidator.equals("updated_at exists", post.updated_at.length > 0, true);
  TestValidator.predicate(
    "updated_at is valid date",
    !Number.isNaN(Date.parse(post.updated_at)),
  );
  // 10. Validate deleted_at is null (not soft-deleted)
  TestValidator.equals("deleted_at is null", post.deleted_at, null);
  // 11. Validate author information
  TestValidator.equals(
    "author username exists",
    post.author.username.length > 0,
    true,
  );
  TestValidator.equals(
    "author display_name exists",
    post.author.display_name.length > 0,
    true,
  );
  TestValidator.equals(
    "author karma is int32",
    Number.isInteger(post.author.karma_score),
    true,
  );
  TestValidator.predicate(
    "author karma is valid",
    post.author.karma_score >= -2147483648 &&
      post.author.karma_score <= 2147483647,
  );
  TestValidator.equals(
    "author is_active is boolean",
    typeof post.author.is_active === "boolean",
    true,
  );
  TestValidator.equals(
    "author created_at exists",
    post.author.created_at.length > 0,
    true,
  );
  // 12. Validate community information
  TestValidator.equals(
    "community name exists",
    post.community.name.length > 0,
    true,
  );
  TestValidator.equals(
    "community subscriber_count is int32",
    Number.isInteger(post.community.subscriber_count),
    true,
  );
  TestValidator.predicate(
    "community subscriber_count non-negative",
    post.community.subscriber_count >= 0,
  );
  TestValidator.equals(
    "community created_at exists",
    post.community.created_at.length > 0,
    true,
  );
  TestValidator.equals(
    "community has owner",
    post.community.owner !== null,
    true,
  );
  TestValidator.equals(
    "community owner username exists",
    post.community.owner.username.length > 0,
    true,
  );
  TestValidator.equals(
    "community owner is_active is boolean",
    typeof post.community.owner.is_active === "boolean",
    true,
  );
  // 13. Validate nested arrays
  TestValidator.equals("votes is array", Array.isArray(post.votes), true);
  TestValidator.equals("comments is array", Array.isArray(post.comments), true);
  TestValidator.equals(
    "snapshots is array",
    Array.isArray(post.snapshots),
    true,
  );
  TestValidator.equals("images is array", Array.isArray(post.images), true);
  TestValidator.equals(
    "engagement_stats is array",
    Array.isArray(post.engagement_stats),
    true,
  );
  // 14. Validate post title
  TestValidator.equals("title exists", post.title.length > 0, true);
  TestValidator.predicate("title length valid", post.title.length <= 300);
  TestValidator.equals(
    "post_id is uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      post.id,
    ),
    true,
  );
  // 15. Validate author id is uuid
  TestValidator.equals(
    "author_id is uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      post.reddit_platform_member_id,
    ),
    true,
  );
  TestValidator.equals(
    "author user id is uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      post.author.id,
    ),
    true,
  );
  // 16. Validate community id is uuid
  TestValidator.equals(
    "community_id is uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      post.reddit_platform_community_id,
    ),
    true,
  );
  TestValidator.equals(
    "community id is uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      post.community.id,
    ),
    true,
  );
  TestValidator.equals(
    "community owner id is uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      post.community.owner.id,
    ),
    true,
  );
}