import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformApiRateLimit } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformApiRateLimit";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformApiRateLimit } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformApiRateLimit";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test advanced range-based filtering capabilities for API rate limit searches.
 * As an administrator, authenticate via admin join, then query rate limits using range filters
 * for max_requests (between 50-100 requests) and time_window_seconds (between 3600-7200 seconds).
 * Verify that the BETWEEN logic works correctly for numeric ranges and that pagination works
 * with custom limit values. Test that page parameters correctly offset results and that the
 * response includes accurate record counts. Validate that the current_usage field reflects
 * actual usage data for monitoring purposes.
 */
export async function test_api_admin_api_rate_limits_search_advanced_range_filters(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Test range filtering for max_requests (50-100)
  const maxRequestsMin = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<50> & tags.Maximum<50>
  >();
  const maxRequestsMax = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<100> & tags.Maximum<100>
  >();
  const rangeSearch1 =
    await api.functional.communityPlatform.admin.api_rate_limits.index(
      adminConnection,
      {
        body: {
          max_requests_min: maxRequestsMin satisfies number as number,
          max_requests_max: maxRequestsMax satisfies number as number,
        } satisfies ICommunityPlatformApiRateLimit.IRequest,
      },
    );
  typia.assert(rangeSearch1);
  // Validate that returned results fall within the max_requests range
  for (const rateLimit of rangeSearch1.data) {
    TestValidator.predicate(
      `max_requests ${rateLimit.max_requests} should be between ${maxRequestsMin} and ${maxRequestsMax}`,
      rateLimit.max_requests >= maxRequestsMin &&
        rateLimit.max_requests <= maxRequestsMax,
    );
  }
  // Test range filtering for time_window_seconds (3600-7200)
  const timeWindowMin = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<3600> & tags.Maximum<3600>
  >();
  const timeWindowMax = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<7200> & tags.Maximum<7200>
  >();
  const rangeSearch2 =
    await api.functional.communityPlatform.admin.api_rate_limits.index(
      adminConnection,
      {
        body: {
          time_window_seconds_min: timeWindowMin satisfies number as number,
          time_window_seconds_max: timeWindowMax satisfies number as number,
        } satisfies ICommunityPlatformApiRateLimit.IRequest,
      },
    );
  typia.assert(rangeSearch2);
  // Validate that returned results fall within the time_window_seconds range
  for (const rateLimit of rangeSearch2.data) {
    TestValidator.predicate(
      `time_window_seconds ${rateLimit.time_window_seconds} should be between ${timeWindowMin} and ${timeWindowMax}`,
      rateLimit.time_window_seconds >= timeWindowMin &&
        rateLimit.time_window_seconds <= timeWindowMax,
    );
  }
  // Test combined range filtering
  const combinedSearch =
    await api.functional.communityPlatform.admin.api_rate_limits.index(
      adminConnection,
      {
        body: {
          max_requests_min: maxRequestsMin satisfies number as number,
          max_requests_max: maxRequestsMax satisfies number as number,
          time_window_seconds_min: timeWindowMin satisfies number as number,
          time_window_seconds_max: timeWindowMax satisfies number as number,
        } satisfies ICommunityPlatformApiRateLimit.IRequest,
      },
    );
  typia.assert(combinedSearch);
  // Validate combined range filtering results
  for (const rateLimit of combinedSearch.data) {
    TestValidator.predicate(
      `combined max_requests ${rateLimit.max_requests} should be between ${maxRequestsMin} and ${maxRequestsMax}`,
      rateLimit.max_requests >= maxRequestsMin &&
        rateLimit.max_requests <= maxRequestsMax,
    );
    TestValidator.predicate(
      `combined time_window_seconds ${rateLimit.time_window_seconds} should be between ${timeWindowMin} and ${timeWindowMax}`,
      rateLimit.time_window_seconds >= timeWindowMin &&
        rateLimit.time_window_seconds <= timeWindowMax,
    );
  }
  // Test pagination with custom limit
  const pageNum = typia.random<
    number & tags.Type<"int32"> & tags.Default<1> & tags.Minimum<1>
  >();
  const pageLimit = typia.random<
    number &
      tags.Type<"int32"> &
      tags.Default<20> &
      tags.Minimum<1> &
      tags.Maximum<100>
  >();
  const paginationSearch =
    await api.functional.communityPlatform.admin.api_rate_limits.index(
      adminConnection,
      {
        body: {
          page: pageNum satisfies number as number,
          limit: pageLimit satisfies number as number,
        } satisfies ICommunityPlatformApiRateLimit.IRequest,
      },
    );
  typia.assert(paginationSearch);
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination has current page",
    paginationSearch.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has limit",
    paginationSearch.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination has records count",
    paginationSearch.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages count",
    paginationSearch.pagination.pages >= 0,
  );
  // Validate that current_usage field exists and is non-negative
  if (combinedSearch.data.length > 0) {
    const rateLimit = combinedSearch.data[0];
    TestValidator.predicate(
      "current_usage is non-negative",
      rateLimit.current_usage >= 0,
    );
  }
  // Test that page parameter correctly offsets results (only if there are multiple pages)
  if (paginationSearch.pagination.pages > 1) {
    const page2Num = Math.min(2, paginationSearch.pagination.pages);
    const page2Search =
      await api.functional.communityPlatform.admin.api_rate_limits.index(
        adminConnection,
        {
          body: {
            page: page2Num satisfies number as number,
            limit: pageLimit satisfies number as number,
          } satisfies ICommunityPlatformApiRateLimit.IRequest,
        },
      );
    typia.assert(page2Search);
    // Verify that page 2 has different data than page 1 (if there are enough records)
    if (page2Search.data.length > 0 && paginationSearch.data.length > 0) {
      TestValidator.notEquals(
        "page 2 has different data than page 1",
        page2Search.data[0].id,
        paginationSearch.data[0].id,
      );
    }
  }
}
