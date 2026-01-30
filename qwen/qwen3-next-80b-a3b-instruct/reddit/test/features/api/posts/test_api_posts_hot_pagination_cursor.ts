import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityBbsCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunity";
import type { ICommunityBbsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsMember";
import type { ICommunityBbsPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPost";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityBbsPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityBbsPost";
export async function test_api_posts_hot_pagination_cursor(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Get hot posts (no parameters supported)
  const hotPosts: IPageICommunityBbsPost =
    await api.functional.communityBbs.posts.hot.index(connection);
  typia.assert(hotPosts);
  // Step 2: Validate response structure
  TestValidator.predicate(
    "page has pagination info",
    hotPosts.pagination !== undefined,
  );
  TestValidator.predicate("page has data array", Array.isArray(hotPosts.data));
  // Step 3: Validate pagination information
  TestValidator.predicate(
    "current page is positive",
    hotPosts.pagination.current >= 1,
  );
  TestValidator.predicate("limit is positive", hotPosts.pagination.limit > 0);
  TestValidator.predicate(
    "records is non-negative",
    hotPosts.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages is non-negative",
    hotPosts.pagination.pages >= 0,
  );
  // Step 4: Validate data contains posts
  TestValidator.predicate(
    "contains at least one post",
    hotPosts.data.length > 0,
  );
  // Step 5: Validate first post structure
  const firstPost = hotPosts.data[0];
  TestValidator.equals("first post has id", typeof firstPost.id, "string");
  TestValidator.equals(
    "first post has title",
    typeof firstPost.title,
    "string",
  );
  TestValidator.predicate(
    "first post has hot_score",
    typeof firstPost.hot_score === "number" && firstPost.hot_score >= 0,
  );
  TestValidator.equals(
    "first post has created_at",
    typeof firstPost.created_at,
    "string",
  );
  TestValidator.equals(
    "first post has author",
    typeof firstPost.author,
    "object",
  );
  TestValidator.equals(
    "first post has community",
    typeof firstPost.community,
    "object",
  );
  TestValidator.equals(
    "first post has content",
    typeof firstPost.content,
    "string",
  );
  TestValidator.equals(
    "first post has author_id",
    typeof firstPost.author_id,
    "string",
  );
  TestValidator.equals(
    "first post has community_id",
    typeof firstPost.community_id,
    "string",
  );
  TestValidator.equals(
    "first post has post_type",
    typeof firstPost.post_type,
    "string",
  );
  TestValidator.equals(
    "first post has status",
    typeof firstPost.status,
    "string",
  );
  TestValidator.equals(
    "first post has updated_at",
    typeof firstPost.updated_at,
    "string",
  );
  TestValidator.equals(
    "first post has likes",
    typeof firstPost.likes,
    "number",
  );
  TestValidator.equals(
    "first post has views",
    typeof firstPost.views,
    "number",
  );
  TestValidator.equals(
    "first post has is_pinned",
    typeof firstPost.is_pinned,
    "boolean",
  );
  TestValidator.equals(
    "first post has comment_count",
    typeof firstPost.comment_count,
    "number",
  );
  // Step 6: Validate author summary structure
  const author = firstPost.author;
  TestValidator.equals("author has id", typeof author.id, "string");
  TestValidator.equals("author has name", typeof author.name, "string");
  TestValidator.equals(
    "author has reputation",
    typeof author.reputation,
    "number",
  );
  // Step 7: Validate community summary structure
  const community = firstPost.community;
  TestValidator.equals("community has id", typeof community.id, "string");
  TestValidator.equals("community has name", typeof community.name, "string");
  // Validate community status is one of the allowed values
  const validStatuses = ["draft", "pending", "active", "archived"] as const;
  TestValidator.predicate(
    "community has valid status",
    validStatuses.includes(community.status),
  );
  TestValidator.predicate(
    "community has created_at",
    typeof community.created_at === "string",
  );
  TestValidator.predicate(
    "community has updated_at",
    typeof community.updated_at === "string",
  );
}
