import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformIPagePopularFeed } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformIPagePopularFeed";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test popular feed endpoint with basic pagination functionality.
 * Verifies pagination metadata accuracy and post summary structure.
 */
export async function test_api_popular_feed_basic_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Test pagination with default parameters (first page)
  const firstPage =
    await api.functional.redditPlatform.popular.index(connection);
  typia.assert(firstPage);
  // Verify pagination structure
  TestValidator.equals(
    "first page number is 1",
    firstPage.pagination.current,
    1,
  );
  TestValidator.predicate(
    "first page has limit",
    firstPage.pagination.limit > 0,
  );
  TestValidator.predicate(
    "total records non-negative",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages calculated correctly",
    firstPage.pagination.pages >= 0,
  );
  // Verify data array structure
  TestValidator.predicate("first page has data", firstPage.data.length >= 0);
  // Validate each post in the data array
  for (const post of firstPage.data) {
    typia.assert(post);
    // Verify required post fields exist and have correct types
    TestValidator.predicate(
      "post has valid ID",
      /^[0-9a-f-]{36}$/i.test(post.id),
    );
    TestValidator.equals("post has title", typeof post.title, "string");
    TestValidator.equals(
      "post has valid type",
      post.type,
      typia.assert<"TEXT" | "LINK" | "IMAGE" | null | undefined>(post.type),
    );
    // Verify author field
    typia.assert(post.author);
    TestValidator.predicate(
      "author has valid ID",
      /^[0-9a-f-]{36}$/i.test(post.author.id),
    );
    TestValidator.equals(
      "author has username",
      typeof post.author.username,
      "string",
    );
    // Verify community field
    typia.assert(post.community);
    TestValidator.predicate(
      "community has valid ID",
      /^[0-9a-f-]{36}$/i.test(post.community.id),
    );
    TestValidator.equals(
      "community has name",
      typeof post.community.name,
      "string",
    );
    // Verify numeric fields
    TestValidator.predicate(
      "vote score is integer",
      Number.isInteger(post.voteScore),
    );
    TestValidator.predicate(
      "comment count is non-negative integer",
      Number.isInteger(post.commentCount) && post.commentCount >= 0,
    );
  }
  // Test pagination with explicit page parameters
  const pageWithLimit =
    await api.functional.redditPlatform.popular.index(connection);
  typia.assert(pageWithLimit);
  // Verify pagination metadata
  TestValidator.equals(
    "pagination current matches expected",
    pageWithLimit.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination has valid limit",
    pageWithLimit.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records consistent",
    pageWithLimit.pagination.records === firstPage.pagination.records,
  );
  // Verify data integrity
  TestValidator.equals(
    "data consistency check",
    pageWithLimit.data.length,
    firstPage.data.length,
  );
  // Test that responses are properly structured
  TestValidator.equals(
    "total pages calculation",
    pageWithLimit.pagination.pages,
    pageWithLimit.pagination.records > 0 && pageWithLimit.pagination.limit > 0
      ? Math.ceil(
          pageWithLimit.pagination.records / pageWithLimit.pagination.limit,
        )
      : 0,
  );
  // Verify that posts contain expected summary fields
  if (firstPage.data.length > 0) {
    const samplePost = firstPage.data[0];
    TestValidator.equals(
      "post has author info",
      samplePost.author !== undefined && samplePost.author !== null,
      true,
    );
    TestValidator.equals(
      "post has community info",
      samplePost.community !== undefined && samplePost.community !== null,
      true,
    );
    TestValidator.equals(
      "post has valid timestamp",
      typeof samplePost.createdAt,
      "string",
    );
  }
}
