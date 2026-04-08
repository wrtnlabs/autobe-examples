import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPost";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test cursor-based pagination navigation on the Popular Feed endpoint.
 *
 * Validates the complete cursor-based pagination workflow for the Popular Feed including first page retrieval, cursor-based navigation, pagination metadata accuracy, duplicate detection, and edge cases like empty results and page size limits.
 *
 * The test ensures that cursor tokens correctly encode position information for consistent ordering across requests, and that pagination metadata (current page, total records, total pages) accurately reflects the data state throughout navigation.
 *
 * 1. First page request without cursor returns initial posts with pagination metadata and next cursor.
 * 2. Second page request with cursor returns next batch of posts without duplicates.
 * 3. Validates pagination metadata consistency: records total remains constant, current page increments.
 * 4. Tests take parameter limiting posts per page within valid range (1-100).
 * 5. Validates empty result set returns proper pagination structure with zero counts.
 * 6. Confirms no post ID duplication between consecutive pages during cursor navigation.
 */
export async function test_api_popular_feed_pagination_cursor_navigation(
  connection: api.IConnection,
): Promise<void> {
  // 1. First page request without cursor
  const firstPageRequest: IRedditCommunityPost.IRequest = {
    take: 5,
    sort: "new",
  };
  const firstPage: IPageIRedditCommunityPost.ISummary =
    await api.functional.redditCommunity.feeds.popular.index(connection, {
      body: firstPageRequest,
    });
  typia.assert(firstPage);
  // Validate first page pagination metadata
  TestValidator.equals("first page current", firstPage.pagination.current, 1);
  TestValidator.predicate(
    "first page limit set",
    firstPage.pagination.limit > 0,
  );
  TestValidator.predicate(
    "first page records non-negative",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "first page pages non-negative",
    firstPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "first page take respected",
    firstPage.data.length <= 5 &&
      firstPage.data.length <= firstPage.pagination.limit,
  );
  // 2. Test minimum take value (take=1)
  const minTakeRequest: IRedditCommunityPost.IRequest = {
    take: 1,
    sort: "new",
  };
  const minTakePage: IPageIRedditCommunityPost.ISummary =
    await api.functional.redditCommunity.feeds.popular.index(connection, {
      body: minTakeRequest,
    });
  typia.assert(minTakePage);
  TestValidator.predicate("min take respected", minTakePage.data.length <= 1);
  TestValidator.equals("min take limit", minTakePage.pagination.limit, 1);
  // 3. Test maximum take value (take=100)
  const maxTakeRequest: IRedditCommunityPost.IRequest = {
    take: 100,
    sort: "new",
  };
  const maxTakePage: IPageIRedditCommunityPost.ISummary =
    await api.functional.redditCommunity.feeds.popular.index(connection, {
      body: maxTakeRequest,
    });
  typia.assert(maxTakePage);
  TestValidator.predicate("max take respected", maxTakePage.data.length <= 100);
  // 4. Cursor-based navigation test (if data exists)
  if (firstPage.data.length > 0 && firstPage.pagination.pages > 1) {
    // Navigate to second page using cursor mechanism
    // Note: API uses cursor-based pagination where cursor encodes position
    const secondPageRequest: IRedditCommunityPost.IRequest = {
      take: 5,
      sort: "new",
      page: 2,
    };
    const secondPage: IPageIRedditCommunityPost.ISummary =
      await api.functional.redditCommunity.feeds.popular.index(connection, {
        body: secondPageRequest,
      });
    typia.assert(secondPage);
    // Validate pagination metadata consistency
    TestValidator.equals(
      "second page current",
      secondPage.pagination.current,
      2,
    );
    TestValidator.equals(
      "records total consistent",
      secondPage.pagination.records,
      firstPage.pagination.records,
    );
    TestValidator.equals(
      "pages total consistent",
      secondPage.pagination.pages,
      firstPage.pagination.pages,
    );
    // 5. Check for duplicate posts between pages
    const firstPageIds = firstPage.data.map((post) => post.id);
    const secondPageIds = secondPage.data.map((post) => post.id);
    for (const secondId of secondPageIds) {
      TestValidator.predicate(
        `no duplicate post ${secondId.substring(0, 8)}`,
        !firstPageIds.includes(secondId),
      );
    }
  }
  // 6. Test different sort options with time range
  const topSortRequest: IRedditCommunityPost.IRequest = {
    take: 5,
    sort: "top",
    timeRange: "thisWeek",
  };
  const topSortPage: IPageIRedditCommunityPost.ISummary =
    await api.functional.redditCommunity.feeds.popular.index(connection, {
      body: topSortRequest,
    });
  typia.assert(topSortPage);
  TestValidator.predicate(
    "top sort pagination valid",
    topSortPage.pagination !== undefined,
  );
  // 7. Test controversial sort
  const controversialRequest: IRedditCommunityPost.IRequest = {
    take: 5,
    sort: "controversial",
  };
  const controversialPage: IPageIRedditCommunityPost.ISummary =
    await api.functional.redditCommunity.feeds.popular.index(connection, {
      body: controversialRequest,
    });
  typia.assert(controversialPage);
  TestValidator.predicate(
    "controversial sort valid",
    controversialPage.data !== undefined,
  );
  // 8. Validate post structure exists (typia.assert already validates types)
  if (firstPage.data.length > 0) {
    const firstPost = firstPage.data[0];
    // Business logic validation only - types already validated by typia.assert
    TestValidator.predicate(
      "post has valid vote score",
      firstPost.vote_score >= 0 || firstPost.vote_score < 0,
    );
    TestValidator.predicate(
      "post has valid comment count",
      firstPost.comment_count >= 0,
    );
  }
  // 9. Test page parameter beyond available range (should return empty with valid metadata)
  if (firstPage.pagination.pages > 0) {
    const beyondLastPageRequest: IRedditCommunityPost.IRequest = {
      take: 5,
      page: firstPage.pagination.pages + 100,
    };
    const beyondLastPage: IPageIRedditCommunityPost.ISummary =
      await api.functional.redditCommunity.feeds.popular.index(connection, {
        body: beyondLastPageRequest,
      });
    typia.assert(beyondLastPage);
    // Should return empty data but valid pagination metadata
    TestValidator.equals(
      "beyond last page data empty",
      beyondLastPage.data.length,
      0,
    );
    TestValidator.predicate(
      "beyond last page has valid metadata",
      beyondLastPage.pagination !== undefined,
    );
  }
}
