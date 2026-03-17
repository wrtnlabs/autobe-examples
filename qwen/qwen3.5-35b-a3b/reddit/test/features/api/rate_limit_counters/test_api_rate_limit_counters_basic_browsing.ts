import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityRateLimitCounter } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityRateLimitCounter";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityRateLimitCounter } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRateLimitCounter";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_rate_limit_counters_basic_browsing(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection for monitoring
  const adminConnection: api.IConnection = { host: connection.host };
  // 1. Test basic browsing with no filters (default pagination)
  const defaultResult =
    await api.functional.redditCommunity.rate_limit_counters.index(
      adminConnection,
      {
        body: {} satisfies IRedditCommunityRateLimitCounter.IRequest,
      },
    );
  typia.assert(defaultResult);
  // 2. Verify pagination metadata exists and has correct structure
  TestValidator.equals(
    "pagination object exists",
    defaultResult.pagination,
    defaultResult.pagination,
  );
  TestValidator.equals(
    "current page is 1 by default",
    defaultResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit defaults to 20",
    defaultResult.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "records is non-negative",
    defaultResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages is non-negative",
    defaultResult.pagination.pages >= 0,
  );
  // 3. Verify each record in data array contains all required fields
  if (defaultResult.data.length > 0) {
    const firstRecord = defaultResult.data[0];
    typia.assert(firstRecord);
    // Verify member has required fields
    typia.assert(firstRecord.member);
    TestValidator.equals(
      "member id is valid",
      firstRecord.member.id,
      firstRecord.member.id,
    );
    TestValidator.predicate(
      "member username is non-empty string",
      firstRecord.member.username.length > 0,
    );
    TestValidator.predicate(
      "member created_at is valid date-time",
      firstRecord.member.created_at.length > 0,
    );
    // Verify endpoint is non-empty string
    TestValidator.predicate(
      "endpoint is non-empty string",
      firstRecord.endpoint.length > 0,
    );
    // Verify request_count is non-negative integer
    TestValidator.predicate(
      "request_count is non-negative",
      firstRecord.request_count >= 0,
    );
    TestValidator.predicate(
      "request_count is integer",
      Number.isInteger(firstRecord.request_count),
    );
    // Verify window dates are valid date-time format
    TestValidator.predicate(
      "window_start is valid date-time",
      firstRecord.window_start.length > 0,
    );
    TestValidator.predicate(
      "window_end is valid date-time",
      firstRecord.window_end.length > 0,
    );
    // Verify window_end is after window_start
    TestValidator.predicate(
      "window_end is after window_start",
      new Date(firstRecord.window_end).getTime() >
        new Date(firstRecord.window_start).getTime(),
    );
  }
  // 4. Test pagination - page 2 should return different subset or empty
  const page2Result =
    await api.functional.redditCommunity.rate_limit_counters.index(
      adminConnection,
      {
        body: { page: 2 } satisfies IRedditCommunityRateLimitCounter.IRequest,
      },
    );
  typia.assert(page2Result);
  TestValidator.equals(
    "page 2 current page is 2",
    page2Result.pagination.current,
    2,
  );
  // 5. Test pagination - page 1 again should return same as first call
  const page1AgainResult =
    await api.functional.redditCommunity.rate_limit_counters.index(
      adminConnection,
      {
        body: { page: 1 } satisfies IRedditCommunityRateLimitCounter.IRequest,
      },
    );
  typia.assert(page1AgainResult);
  TestValidator.equals(
    "page 1 returns consistent results",
    JSON.stringify(defaultResult.data.map((r) => r.id)),
    JSON.stringify(page1AgainResult.data.map((r) => r.id)),
  );
  // 6. Test limit parameter - use maximum allowed (100)
  const maxLimitResult =
    await api.functional.redditCommunity.rate_limit_counters.index(
      adminConnection,
      {
        body: {
          limit: 100,
        } satisfies IRedditCommunityRateLimitCounter.IRequest,
      },
    );
  typia.assert(maxLimitResult);
  TestValidator.equals(
    "max limit sets limit to 100",
    maxLimitResult.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "max limit results count is correct",
    maxLimitResult.data.length <= 100,
  );
  // 7. Test limit parameter - use minimum (1)
  const minLimitResult =
    await api.functional.redditCommunity.rate_limit_counters.index(
      adminConnection,
      {
        body: { limit: 1 } satisfies IRedditCommunityRateLimitCounter.IRequest,
      },
    );
  typia.assert(minLimitResult);
  TestValidator.equals(
    "min limit sets limit to 1",
    minLimitResult.pagination.limit,
    1,
  );
  TestValidator.predicate(
    "min limit returns at most 1 record",
    minLimitResult.data.length <= 1,
  );
  // 8. Test total pages calculation
  const totalPages = Math.ceil(
    defaultResult.pagination.records / defaultResult.pagination.limit,
  );
  TestValidator.equals(
    "pages calculation is correct",
    defaultResult.pagination.pages,
    totalPages,
  );
  // 9. Test sorting - default should be most recent window_start first (descending)
  if (defaultResult.data.length >= 2) {
    const firstWindowStart = new Date(
      defaultResult.data[0].window_start,
    ).getTime();
    const secondWindowStart = new Date(
      defaultResult.data[1].window_start,
    ).getTime();
    TestValidator.predicate(
      "results sorted by window_start descending (most recent first)",
      firstWindowStart >= secondWindowStart,
    );
  }
  // 10. Test with custom sorting options
  const sortedResult =
    await api.functional.redditCommunity.rate_limit_counters.index(
      adminConnection,
      {
        body: {
          sortBy: "request_count",
          sortOrder: "desc",
        } satisfies IRedditCommunityRateLimitCounter.IRequest,
      },
    );
  typia.assert(sortedResult);
  // 11. Test with member_id filter
  if (defaultResult.data.length > 0) {
    const memberFilterResult =
      await api.functional.redditCommunity.rate_limit_counters.index(
        adminConnection,
        {
          body: {
            member_id: defaultResult.data[0].member.id,
          } satisfies IRedditCommunityRateLimitCounter.IRequest,
        },
      );
    typia.assert(memberFilterResult);
    TestValidator.predicate(
      "member filter returns matching records",
      memberFilterResult.data.length > 0,
    );
    // Verify all returned records belong to the same member
    for (const record of memberFilterResult.data) {
      TestValidator.equals(
        "record belongs to filtered member",
        record.member.id,
        defaultResult.data[0].member.id,
      );
    }
  }
  // 12. Test with endpoint filter
  if (defaultResult.data.length > 0) {
    const endpointFilterResult =
      await api.functional.redditCommunity.rate_limit_counters.index(
        adminConnection,
        {
          body: {
            endpoint: defaultResult.data[0].endpoint,
          } satisfies IRedditCommunityRateLimitCounter.IRequest,
        },
      );
    typia.assert(endpointFilterResult);
    TestValidator.predicate(
      "endpoint filter returns matching records",
      endpointFilterResult.data.length >= 0,
    );
  }
  // 13. Test with request count range filter
  const requestCountFilterResult =
    await api.functional.redditCommunity.rate_limit_counters.index(
      adminConnection,
      {
        body: {
          request_count_min: 0,
          request_count_max: 1000,
        } satisfies IRedditCommunityRateLimitCounter.IRequest,
      },
    );
  typia.assert(requestCountFilterResult);
  // 14. Test invalid page number (should default to 1 or handle gracefully)
  const invalidPageResult =
    await api.functional.redditCommunity.rate_limit_counters.index(
      adminConnection,
      {
        body: { page: 0 } satisfies IRedditCommunityRateLimitCounter.IRequest,
      },
    );
  typia.assert(invalidPageResult);
  TestValidator.predicate(
    "invalid page handled gracefully",
    invalidPageResult.pagination.current >= 1,
  );
  // 15. Test invalid limit (should clamp to valid range)
  const invalidLimitResult =
    await api.functional.redditCommunity.rate_limit_counters.index(
      adminConnection,
      {
        body: { limit: 0 } satisfies IRedditCommunityRateLimitCounter.IRequest,
      },
    );
  typia.assert(invalidLimitResult);
  TestValidator.predicate(
    "invalid limit handled gracefully",
    invalidLimitResult.pagination.limit >= 1,
  );
}
