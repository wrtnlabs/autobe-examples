import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";
export async function test_api_community_post_feed_top_sorting(
  connection: api.IConnection,
): Promise<void> {
  // Generate random community code for testing
  const communityCode = typia.random<string & tags.MinLength<1>>();
  // Call the top posts API endpoint with the generated community code
  const result: IPageICommunityPlatformPost.ISummary =
    await api.functional.communityPlatform.communities.posts.top.index(
      connection,
      { communityCode },
    );
  // Validate the response structure and data integrity
  typia.assert(result);
  // Verify pagination metadata structure
  TestValidator.equals(
    "pagination has correct structure",
    typeof result.pagination,
    "object",
  );
  TestValidator.equals(
    "pagination current should be positive",
    result.pagination.current > 0,
    true,
  );
  TestValidator.equals(
    "pagination limit should be positive",
    result.pagination.limit > 0,
    true,
  );
  TestValidator.equals(
    "pagination records should be non-negative",
    result.pagination.records >= 0,
    true,
  );
  TestValidator.equals(
    "pagination pages should be non-negative",
    result.pagination.pages >= 0,
    true,
  );
  // Verify posts are present and correctly structured
  TestValidator.predicate(
    "should have at least one post",
    result.data.length > 0,
  );
  // Validate each post in the result set has required properties
  for (const post of result.data) {
    // Verify post has required properties from schema
    TestValidator.equals("post id should be string", typeof post.id, "string");
    TestValidator.equals(
      "author should be object",
      typeof post.author,
      "object",
    );
    TestValidator.equals(
      "community should be object",
      typeof post.community,
      "object",
    );
    TestValidator.equals(
      "voteScore should be number",
      typeof post.voteScore,
      "number",
    );
    TestValidator.equals(
      "commentCount should be number",
      typeof post.commentCount,
      "number",
    );
    TestValidator.equals(
      "createdAt should be string",
      typeof post.createdAt,
      "string",
    );
  }
}
