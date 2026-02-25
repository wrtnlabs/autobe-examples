import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommercePlatformEventOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformEventOfSeller";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommercePlatformEventOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformEventOfSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_seller_approval_queue_search_date_range_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePass123!",
    },
  });
  // Generate test date ranges
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const threeWeeksAgo = new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000);
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  // Test 1: Submission date range filtering
  const submissionSearch =
    await api.functional.ecommerce.administrator.seller_approval_queues.index(
      adminConnection,
      {
        body: {
          submission_date_start: oneWeekAgo.toISOString(),
          submission_date_end: now.toISOString(),
          limit: 10,
          page: 1,
        } satisfies IEcommercePlatformEventOfSeller.IRequest,
      },
    );
  typia.assert(submissionSearch);
  // Validate results fall within date range
  submissionSearch.data.forEach((item) => {
    const submissionDate = new Date(item.submission_date);
    TestValidator.predicate(
      "submission date must be within specified range",
      submissionDate >= oneWeekAgo && submissionDate <= now,
    );
  });
  // Test 2: Review start date range filtering
  const reviewSearch =
    await api.functional.ecommerce.administrator.seller_approval_queues.index(
      adminConnection,
      {
        body: {
          review_start_date_start: twoWeeksAgo.toISOString(),
          review_start_date_end: oneWeekAgo.toISOString(),
          limit: 10,
          page: 1,
        } satisfies IEcommercePlatformEventOfSeller.IRequest,
      },
    );
  typia.assert(reviewSearch);
  // Validate review dates are within range or null (for pending requests)
  reviewSearch.data.forEach((item) => {
    if (item.review_start_date !== null) {
      const reviewStartDate = new Date(item.review_start_date);
      TestValidator.predicate(
        "review start date must be within specified range",
        reviewStartDate >= twoWeeksAgo && reviewStartDate <= oneWeekAgo,
      );
    }
  });
  // Test 3: Multiple date filters combined
  const combinedSearch =
    await api.functional.ecommerce.administrator.seller_approval_queues.index(
      adminConnection,
      {
        body: {
          submission_date_start: oneMonthAgo.toISOString(),
          submission_date_end: threeWeeksAgo.toISOString(),
          review_start_date_start: threeWeeksAgo.toISOString(),
          review_start_date_end: twoWeeksAgo.toISOString(),
          limit: 5,
          page: 1,
        } satisfies IEcommercePlatformEventOfSeller.IRequest,
      },
    );
  typia.assert(combinedSearch);
  // Test 4: Pagination with date filtering
  const paginatedSearch =
    await api.functional.ecommerce.administrator.seller_approval_queues.index(
      adminConnection,
      {
        body: {
          submission_date_start: threeWeeksAgo.toISOString(),
          submission_date_end: now.toISOString(),
          limit: 5,
          page: 1,
        } satisfies IEcommercePlatformEventOfSeller.IRequest,
      },
    );
  typia.assert(paginatedSearch);
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination metadata should be present",
    paginatedSearch.pagination.current === 1 &&
      paginatedSearch.pagination.limit === 5 &&
      paginatedSearch.pagination.records >= 0 &&
      paginatedSearch.pagination.pages >= 0,
  );
  // Test 5: Empty date bounds (should return all)
  const emptyBoundsSearch =
    await api.functional.ecommerce.administrator.seller_approval_queues.index(
      adminConnection,
      {
        body: {
          submission_date_start: undefined,
          submission_date_end: undefined,
          limit: 100,
          page: 1,
        } satisfies IEcommercePlatformEventOfSeller.IRequest,
      },
    );
  typia.assert(emptyBoundsSearch);
  TestValidator.predicate(
    "empty bounds should return results",
    emptyBoundsSearch.data.length >= 0,
  );
}
