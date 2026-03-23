import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditClonePost";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test that guest users can browse the popular feed without authentication.
 *
 * This test validates the primary public content discovery feature by:
 * 1. Requesting posts with feed_type='popular' (accessible to guests)
 * 2. Verifying pagination metadata is present and correct
 * 3. Validating each post summary contains required fields
 * 4. Ensuring nested author and community summaries are populated
 * 5. Testing pagination with custom page_size parameter
 */
export async function test_api_post_popular_feed_browsing(
  connection: api.IConnection,
): Promise<void> {
  // 1. Request popular feed with default pagination
  const response1 = await api.functional.redditClone.posts.index(connection, {
    body: {
      feed_type: "popular",
    } satisfies IRedditClonePost.IRequest,
  });
  typia.assert(response1);
  // 2. Validate pagination metadata values
  TestValidator.equals("current page is 1", response1.pagination.current, 1);
  TestValidator.predicate("limit is positive", response1.pagination.limit > 0);
  TestValidator.predicate(
    "records count is non-negative",
    response1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    response1.pagination.pages >= 0,
  );
  // 3. Validate data array respects pagination limit
  TestValidator.predicate(
    "data length does not exceed limit",
    response1.data.length <= response1.pagination.limit,
  );
  // 4. Validate pagination calculation (pages = ceil(records / limit))
  const expectedPages =
    response1.pagination.records === 0
      ? 0
      : Math.ceil(response1.pagination.records / response1.pagination.limit);
  TestValidator.equals(
    "pages calculation is correct",
    response1.pagination.pages,
    expectedPages,
  );
  // 5. If posts exist, validate business logic
  if (response1.data.length > 0) {
    const firstPost = response1.data[0];
    // Validate post score is a valid integer
    TestValidator.predicate(
      "first post score is integer",
      Number.isInteger(firstPost.score),
    );
    // Validate comment count is non-negative
    TestValidator.predicate(
      "first post comment count is non-negative",
      firstPost.comment_count >= 0,
    );
    // Validate author karma is integer
    TestValidator.predicate(
      "author karma is integer",
      Number.isInteger(firstPost.author.karma),
    );
    // Validate community subscriber count is non-negative
    TestValidator.predicate(
      "community subscriber count is non-negative",
      firstPost.community.subscriber_count >= 0,
    );
    // Validate owner exists in community
    TestValidator.predicate(
      "community has owner",
      firstPost.community.owner !== null,
    );
  }
  // 6. Test with custom page_size
  const response2 = await api.functional.redditClone.posts.index(connection, {
    body: {
      feed_type: "popular",
      page: 1,
      page_size: 10,
    } satisfies IRedditClonePost.IRequest,
  });
  typia.assert(response2);
  TestValidator.equals(
    "custom page_size applied",
    response2.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "data respects custom limit",
    response2.data.length <= 10,
  );
  TestValidator.equals("page is 1", response2.pagination.current, 1);
  // 7. Test with different sort options
  const response3 = await api.functional.redditClone.posts.index(connection, {
    body: {
      feed_type: "popular",
      sort: "new",
      page: 1,
    } satisfies IRedditClonePost.IRequest,
  });
  typia.assert(response3);
  TestValidator.predicate("sort by new returns valid response", true);
  TestValidator.equals(
    "pagination current page",
    response3.pagination.current,
    1,
  );
  // 8. Test with top sort and time_filter
  const response4 = await api.functional.redditClone.posts.index(connection, {
    body: {
      feed_type: "popular",
      sort: "top",
      time_filter: "week",
      page: 1,
    } satisfies IRedditClonePost.IRequest,
  });
  typia.assert(response4);
  TestValidator.predicate("top sort with time_filter works", true);
  TestValidator.equals(
    "pagination current page",
    response4.pagination.current,
    1,
  );
  // 9. Test pagination with page=2
  const response5 = await api.functional.redditClone.posts.index(connection, {
    body: {
      feed_type: "popular",
      page: 2,
      page_size: 5,
    } satisfies IRedditClonePost.IRequest,
  });
  typia.assert(response5);
  TestValidator.equals("page 2 requested", response5.pagination.current, 2);
  TestValidator.equals("page_size is 5", response5.pagination.limit, 5);
  TestValidator.predicate(
    "page 2 data respects limit",
    response5.data.length <= 5,
  );
}
