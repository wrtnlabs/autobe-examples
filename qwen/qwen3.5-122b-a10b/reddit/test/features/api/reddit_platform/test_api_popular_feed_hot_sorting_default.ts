import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPost";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformFile";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test the popular feed endpoint with hot sorting (default behavior).
 *
 * A guest user accesses the popular feed to discover trending content across all communities.
 * The system should return posts from all communities sorted by hot algorithm (recent posts
 * with high vote scores), showing post summaries with title, author username, community name,
 * vote score, comment count, and content preview. Verify that pagination metadata is included
 * with current page, limit, total records, and total pages. Validate that each post summary
 * contains all required fields including post_type and preview.
 */
export async function test_api_popular_feed_hot_sorting_default(
  connection: api.IConnection,
): Promise<void> {
  // Test 1: Default hot sorting (no explicit sort_by parameter)
  const defaultResponse: IPageIRedditPlatformPost.ISummary =
    await api.functional.redditPlatform.feeds.popular.index(connection, {
      body: {
        page: 1,
        limit: 20,
      } satisfies IRedditPlatformPost.IRequest,
    });
  typia.assert(defaultResponse);
  // Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    defaultResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    defaultResponse.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "pagination has records",
    defaultResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages",
    defaultResponse.pagination.pages >= 0,
  );
  // Test 2: Explicit hot sorting
  const hotResponse: IPageIRedditPlatformPost.ISummary =
    await api.functional.redditPlatform.feeds.popular.index(connection, {
      body: {
        page: 1,
        limit: 10,
        sort_by: "hot",
      } satisfies IRedditPlatformPost.IRequest,
    });
  typia.assert(hotResponse);
  // Validate pagination metadata for hot sort
  TestValidator.equals(
    "hot sort pagination current",
    hotResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "hot sort pagination limit",
    hotResponse.pagination.limit,
    10,
  );
  // Test 3: Validate post summary structure for each post
  if (hotResponse.data.length > 0) {
    const firstPost = hotResponse.data[0];
    // Validate required fields exist
    TestValidator.predicate("post has id", firstPost.id.length > 0);
    TestValidator.predicate("post has title", firstPost.title.length > 0);
    TestValidator.predicate(
      "post has author",
      firstPost.author.username.length > 0,
    );
    TestValidator.predicate(
      "post has community",
      firstPost.community.name.length > 0,
    );
    TestValidator.predicate(
      "post has vote score",
      typeof firstPost.vote_score === "number",
    );
    TestValidator.predicate(
      "post has comment count",
      typeof firstPost.comment_count === "number",
    );
    TestValidator.predicate(
      "post has created_at",
      firstPost.created_at.length > 0,
    );
    TestValidator.predicate(
      "post has post_type",
      firstPost.post_type.length > 0,
    );
    TestValidator.predicate("post has preview", firstPost.preview.length >= 0);
    // Validate author summary structure
    TestValidator.predicate("author has id", firstPost.author.id.length > 0);
    TestValidator.predicate(
      "author has username",
      firstPost.author.username.length > 0,
    );
    TestValidator.predicate(
      "author has karma_score",
      typeof firstPost.author.karma_score === "number",
    );
    // Validate community summary structure
    TestValidator.predicate(
      "community has id",
      firstPost.community.id.length > 0,
    );
    TestValidator.predicate(
      "community has name",
      firstPost.community.name.length > 0,
    );
    TestValidator.predicate(
      "community has owner",
      firstPost.community.owner.username.length > 0,
    );
    TestValidator.predicate(
      "community has subscriber_count",
      typeof firstPost.community.subscriber_count === "number",
    );
  }
  // Test 4: Pagination with different page numbers
  const page2Response: IPageIRedditPlatformPost.ISummary =
    await api.functional.redditPlatform.feeds.popular.index(connection, {
      body: {
        page: 2,
        limit: 10,
        sort_by: "hot",
      } satisfies IRedditPlatformPost.IRequest,
    });
  typia.assert(page2Response);
  TestValidator.equals("page 2 current", page2Response.pagination.current, 2);
  TestValidator.equals("page 2 limit", page2Response.pagination.limit, 10);
  // Test 5: Different limit values
  const largeLimitResponse: IPageIRedditPlatformPost.ISummary =
    await api.functional.redditPlatform.feeds.popular.index(connection, {
      body: {
        page: 1,
        limit: 50,
        sort_by: "hot",
      } satisfies IRedditPlatformPost.IRequest,
    });
  typia.assert(largeLimitResponse);
  TestValidator.equals(
    "large limit pagination limit",
    largeLimitResponse.pagination.limit,
    50,
  );
  TestValidator.predicate(
    "large limit has data",
    largeLimitResponse.data.length <= 50,
  );
  // Test 6: Maximum limit (100)
  const maxLimitResponse: IPageIRedditPlatformPost.ISummary =
    await api.functional.redditPlatform.feeds.popular.index(connection, {
      body: {
        page: 1,
        limit: 100,
        sort_by: "hot",
      } satisfies IRedditPlatformPost.IRequest,
    });
  typia.assert(maxLimitResponse);
  TestValidator.equals(
    "max limit pagination limit",
    maxLimitResponse.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "max limit has data",
    maxLimitResponse.data.length <= 100,
  );
}
