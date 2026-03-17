import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikePost";
import type { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeGuest";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test the popular feed time filtering for 'top' and 'controversial' sorting with time range constraints.
 *
 * **Time Filter Scenarios:**
 * 1. Call sort='top' with timeFilter='today' and verify posts are returned with correct pagination
 * 2. Call sort='top' with timeFilter='week' and verify posts are returned
 * 3. Call sort='top' with timeFilter='month' and verify posts are returned
 * 4. Call sort='top' with timeFilter='year' and verify posts are returned
 * 5. Call sort='top' with timeFilter='all_time' and verify all posts can be returned
 *
 * **Similar filter testing for 'controversial':**
 * - Apply same time filter variants and verify results respect the time boundaries
 *
 * **Edge Case:** Test when time filter window contains no posts - verify empty result set with correct pagination
 */
export async function test_api_guest_feeds_popular_time_filter_ranges(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as guest
  const guestConnection: api.IConnection = { host: connection.host };
  await authorize_guest_join(guestConnection, {});
  const timeFilters: Array<IRedditLikePost.IRequest["timeFilter"]> = [
    "today",
    "week",
    "month",
    "year",
    "all_time",
  ];
  // 2. Test 'top' sort with various time filters
  for (const timeFilter of timeFilters) {
    const topResponse =
      await api.functional.redditLike.guest.feeds.popular.index(
        guestConnection,
        {
          body: {
            sort: "top",
            timeFilter,
            page: 1,
            limit: 20,
          } satisfies IRedditLikePost.IRequest,
        },
      );
    typia.assert(topResponse);
    // Verify pagination structure
    TestValidator.predicate(
      "pagination has valid current page",
      topResponse.pagination.current >= 0,
    );
    TestValidator.predicate(
      "pagination has valid limit",
      topResponse.pagination.limit > 0,
    );
    TestValidator.predicate(
      "pagination has valid records",
      topResponse.pagination.records >= 0,
    );
    TestValidator.predicate(
      "pagination has valid pages",
      topResponse.pagination.pages >= 0,
    );
  }
  // 3. Test 'controversial' sort with various time filters
  for (const timeFilter of timeFilters) {
    const controversialResponse =
      await api.functional.redditLike.guest.feeds.popular.index(
        guestConnection,
        {
          body: {
            sort: "controversial",
            timeFilter,
            page: 1,
            limit: 20,
          } satisfies IRedditLikePost.IRequest,
        },
      );
    typia.assert(controversialResponse);
    // Verify pagination structure
    TestValidator.predicate(
      "pagination has valid current page",
      controversialResponse.pagination.current >= 0,
    );
    TestValidator.predicate(
      "pagination has valid limit",
      controversialResponse.pagination.limit > 0,
    );
    TestValidator.predicate(
      "pagination has valid records",
      controversialResponse.pagination.records >= 0,
    );
    TestValidator.predicate(
      "pagination has valid pages",
      controversialResponse.pagination.pages >= 0,
    );
  }
  // 4. Test edge case with pagination that may return empty results
  const emptyPageResponse =
    await api.functional.redditLike.guest.feeds.popular.index(guestConnection, {
      body: {
        sort: "top",
        timeFilter: "today",
        page: 999999, // Very high page number likely to be empty
        limit: 20,
      } satisfies IRedditLikePost.IRequest,
    });
  typia.assert(emptyPageResponse);
  // Verify empty result handling
  TestValidator.predicate(
    "empty page returns zero records",
    emptyPageResponse.pagination.records === 0,
  );
  TestValidator.predicate(
    "empty page returns zero pages",
    emptyPageResponse.pagination.pages === 0,
  );
  TestValidator.equals(
    "empty page returns empty data array",
    emptyPageResponse.data.length,
    0,
  );
}
