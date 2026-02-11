import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformFeedResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformFeedResult";
import type { IRedditPlatformFeedResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformFeedResult";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_reddit_platform_results_pagination_boundaries(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create authenticated member connection
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      username: RandomGenerator.name(2),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(member);
  // 2. Test minimum pagination (single record)
  const singlePage = await api.functional.redditPlatform.results.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 1,
      } satisfies IRedditPlatformFeedResult.IRequest,
    },
  );
  typia.assert(singlePage);
  TestValidator.equals("single page has data", singlePage.data.length, 1);
  TestValidator.predicate(
    "pagination info correct for single",
    singlePage.pagination.current === 1 &&
      singlePage.pagination.limit === 1 &&
      singlePage.pagination.records >= 0,
  );
  // 3. Test maximum pagination (upper bound enforcement)
  const maxPage = await api.functional.redditPlatform.results.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies IRedditPlatformFeedResult.IRequest,
    },
  );
  typia.assert(maxPage);
  TestValidator.predicate(
    "max page pagination info",
    maxPage.pagination.limit === 100 &&
      maxPage.pagination.current === 1 &&
      maxPage.pagination.records >= 0,
  );
  // 4. Test pagination beyond available records
  const emptyPage = await api.functional.redditPlatform.results.index(
    memberConnection,
    {
      body: {
        page: 999,
        limit: 20,
      } satisfies IRedditPlatformFeedResult.IRequest,
    },
  );
  typia.assert(emptyPage);
  TestValidator.equals("empty page data array", emptyPage.data.length, 0);
  TestValidator.equals(
    "empty page pagination records",
    emptyPage.pagination.records,
    0,
  );
  // 5. Test all sorting algorithms
  const sorts = ["hot", "new", "top", "controversial"] as const;
  for (const sort of sorts) {
    const sortedPage = await api.functional.redditPlatform.results.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 10,
          sort: sort,
        } satisfies IRedditPlatformFeedResult.IRequest,
      },
    );
    typia.assert(sortedPage);
    TestValidator.equals(
      "sort algorithm applied",
      sortedPage.pagination.current,
      1,
    );
  }
  // 6. Test time filter edge cases
  const timeFilters = ["today", "week", "month", "year", "all_time"] as const;
  for (const timeFilter of timeFilters) {
    const timePage = await api.functional.redditPlatform.results.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 10,
          timeFilter: timeFilter,
        } satisfies IRedditPlatformFeedResult.IRequest,
      },
    );
    typia.assert(timePage);
    TestValidator.equals(
      `time filter ${timeFilter} response structure`,
      timePage.pagination.current,
      1,
    );
    TestValidator.equals(
      `time filter ${timeFilter} limit`,
      timePage.pagination.limit,
      10,
    );
  }
  // 7. Test community filtering with non-existent community UUID
  const nonExistentCommunityId =
    "00000000-0000-0000-0000-000000000000" as string & tags.Format<"uuid">;
  const communityPage = await api.functional.redditPlatform.results.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 10,
        communityId: nonExistentCommunityId,
      } satisfies IRedditPlatformFeedResult.IRequest,
    },
  );
  typia.assert(communityPage);
  TestValidator.equals(
    "non-existent community returns empty data",
    communityPage.data.length,
    0,
  );
  // 8. Test subscribed communities filter with zero subscriptions
  const subscribedPage = await api.functional.redditPlatform.results.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 10,
        includeSubscribedOnly: true,
      } satisfies IRedditPlatformFeedResult.IRequest,
    },
  );
  typia.assert(subscribedPage);
  TestValidator.predicate(
    "subscribed-only with zero subs",
    subscribedPage.data.length === 0 && subscribedPage.pagination.records === 0,
  );
  // 9. Test cursor-based pagination edge (last page returns fewer records)
  const lastPage = await api.functional.redditPlatform.results.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 500, // Large limit to hit the end
      } satisfies IRedditPlatformFeedResult.IRequest,
    },
  );
  typia.assert(lastPage);
  if (lastPage.pagination.records > 0) {
    const totalPages = lastPage.pagination.pages;
    const finalPage = await api.functional.redditPlatform.results.index(
      memberConnection,
      {
        body: {
          page: totalPages,
          limit: 20,
        } satisfies IRedditPlatformFeedResult.IRequest,
      },
    );
    typia.assert(finalPage);
    TestValidator.predicate(
      "final page has <= limit records",
      finalPage.data.length <= 20,
    );
  }
  // 10. Verify response structure consistency
  const populatedPage = await api.functional.redditPlatform.results.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 5,
      } satisfies IRedditPlatformFeedResult.IRequest,
    },
  );
  typia.assert(populatedPage);
  const emptyPage2 = await api.functional.redditPlatform.results.index(
    memberConnection,
    {
      body: {
        page: 999,
        limit: 5,
      } satisfies IRedditPlatformFeedResult.IRequest,
    },
  );
  typia.assert(emptyPage2);
  // Both responses should have same structure
  TestValidator.equals(
    "response structure consistency - pagination present",
    populatedPage.pagination !== undefined,
    emptyPage2.pagination !== undefined,
  );
  TestValidator.equals(
    "response structure consistency - data array present",
    populatedPage.data !== undefined,
    emptyPage2.data !== undefined,
  );
  // Verify empty page structure matches populated structure
  TestValidator.equals(
    "empty page pagination fields",
    typeof emptyPage2.pagination.current,
    typeof populatedPage.pagination.current,
  );
  TestValidator.equals(
    "empty page data type",
    Array.isArray(emptyPage2.data),
    Array.isArray(populatedPage.data),
  );
}
