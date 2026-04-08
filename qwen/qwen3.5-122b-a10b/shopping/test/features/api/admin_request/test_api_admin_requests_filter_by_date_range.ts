import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import type { IEcommerceAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdminRequest";
import type { IEcommerceAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministratorGrade";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceAdminRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test administrator access request filtering by date range.
 *
 * Validates that administrators can filter admin access requests using creation date and review date range filters. The test queries existing admin requests and verifies that filtering by created_at_from, created_at_to, reviewed_at_from, and reviewed_at_to correctly returns only requests within the specified date ranges.
 *
 * The test validates that date range filters work independently and can be combined, and that pagination correctly reflects the filtered result set. This ensures audit and reporting functionality works correctly for admin request management.
 *
 * 1. Authenticate as administrator using join endpoint.
 * 2. Retrieve all existing admin requests to establish available date ranges.
 * 3. Test filtering by created_at_from and created_at_to date range.
 * 4. Test filtering by reviewed_at_from and reviewed_at_to date range.
 * 5. Test combining creation and review date filters.
 * 6. Validate pagination metadata reflects filtered results count.
 */
export async function test_api_admin_requests_filter_by_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      reason: RandomGenerator.paragraph({ sentences: 3 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Retrieve all existing admin requests to establish available date ranges
  const allRequests = await api.functional.ecommerce.admin.requests.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies IEcommerceAdminRequest.IRequest,
    },
  );
  typia.assert(allRequests);
  // If no requests exist, the test validates empty result handling
  if (allRequests.data.length === 0) {
    // Test that filtering with no data returns empty results
    const emptyFilter = await api.functional.ecommerce.admin.requests.index(
      adminConnection,
      {
        body: {
          created_at_from: new Date().toISOString(),
          page: 1,
          limit: 100,
        } satisfies IEcommerceAdminRequest.IRequest,
      },
    );
    typia.assert(emptyFilter);
    TestValidator.equals(
      "empty filter returns no results",
      emptyFilter.data.length,
      0,
    );
    TestValidator.equals(
      "pagination records is 0",
      emptyFilter.pagination.records,
      0,
    );
    return;
  }
  // Extract creation dates from existing requests
  const dates = allRequests.data.map((req) => new Date(req.created_at));
  const earliestDate = new Date(Math.min(...dates.map((d) => d.getTime())));
  const latestDate = new Date(Math.max(...dates.map((d) => d.getTime())));
  // 3. Test filtering by created_at_from
  const fromFilter = await api.functional.ecommerce.admin.requests.index(
    adminConnection,
    {
      body: {
        created_at_from: earliestDate.toISOString(),
        page: 1,
        limit: 100,
      } satisfies IEcommerceAdminRequest.IRequest,
    },
  );
  typia.assert(fromFilter);
  TestValidator.predicate(
    "created_at_from filter returns requests from earliest date or later",
    fromFilter.data.every((req) => new Date(req.created_at) >= earliestDate),
  );
  // 4. Test filtering by created_at_to
  const toFilter = await api.functional.ecommerce.admin.requests.index(
    adminConnection,
    {
      body: {
        created_at_to: earliestDate.toISOString(),
        page: 1,
        limit: 100,
      } satisfies IEcommerceAdminRequest.IRequest,
    },
  );
  typia.assert(toFilter);
  TestValidator.predicate(
    "created_at_to filter returns requests up to earliest date",
    toFilter.data.every((req) => new Date(req.created_at) <= earliestDate),
  );
  // 5. Test filtering by created_at_from and created_at_to combined
  const rangeFilter = await api.functional.ecommerce.admin.requests.index(
    adminConnection,
    {
      body: {
        created_at_from: earliestDate.toISOString(),
        created_at_to: latestDate.toISOString(),
        page: 1,
        limit: 100,
      } satisfies IEcommerceAdminRequest.IRequest,
    },
  );
  typia.assert(rangeFilter);
  TestValidator.predicate(
    "combined date range filter returns requests within range",
    rangeFilter.data.every(
      (req) =>
        new Date(req.created_at) >= earliestDate &&
        new Date(req.created_at) <= latestDate,
    ),
  );
  // 6. Test filtering by reviewed_at date range (if any requests have been reviewed)
  const reviewedRequests = allRequests.data.filter(
    (req) => req.reviewed_at !== null && req.reviewed_at !== undefined,
  );
  if (reviewedRequests.length > 0) {
    const reviewedDates = reviewedRequests.map(
      (req) => new Date(req.reviewed_at!),
    );
    const earliestReviewed = new Date(
      Math.min(...reviewedDates.map((d) => d.getTime())),
    );
    const latestReviewed = new Date(
      Math.max(...reviewedDates.map((d) => d.getTime())),
    );
    // Test filtering by reviewed_at_from
    const reviewedFromFilter =
      await api.functional.ecommerce.admin.requests.index(adminConnection, {
        body: {
          reviewed_at_from: earliestReviewed.toISOString(),
          page: 1,
          limit: 100,
        } satisfies IEcommerceAdminRequest.IRequest,
      });
    typia.assert(reviewedFromFilter);
    TestValidator.predicate(
      "reviewed_at_from filter returns reviewed requests from earliest review date",
      reviewedFromFilter.data.every(
        (req) =>
          req.reviewed_at !== null &&
          req.reviewed_at !== undefined &&
          new Date(req.reviewed_at) >= earliestReviewed,
      ),
    );
    // Test filtering by reviewed_at_to
    const reviewedToFilter =
      await api.functional.ecommerce.admin.requests.index(adminConnection, {
        body: {
          reviewed_at_to: earliestReviewed.toISOString(),
          page: 1,
          limit: 100,
        } satisfies IEcommerceAdminRequest.IRequest,
      });
    typia.assert(reviewedToFilter);
    TestValidator.predicate(
      "reviewed_at_to filter returns reviewed requests up to earliest review date",
      reviewedToFilter.data.every(
        (req) =>
          req.reviewed_at !== null &&
          req.reviewed_at !== undefined &&
          new Date(req.reviewed_at) <= earliestReviewed,
      ),
    );
    // 7. Test combining creation and review date filters
    const combinedFilter = await api.functional.ecommerce.admin.requests.index(
      adminConnection,
      {
        body: {
          created_at_from: earliestDate.toISOString(),
          reviewed_at_from: earliestReviewed.toISOString(),
          page: 1,
          limit: 100,
        } satisfies IEcommerceAdminRequest.IRequest,
      },
    );
    typia.assert(combinedFilter);
    TestValidator.predicate(
      "combined creation and review date filters work together",
      combinedFilter.data.every(
        (req) =>
          new Date(req.created_at) >= earliestDate &&
          req.reviewed_at !== null &&
          req.reviewed_at !== undefined &&
          new Date(req.reviewed_at) >= earliestReviewed,
      ),
    );
  }
  // 8. Validate pagination metadata
  TestValidator.equals(
    "pagination records matches data length",
    rangeFilter.pagination.records,
    rangeFilter.data.length,
  );
  TestValidator.predicate(
    "pagination current is 1",
    rangeFilter.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is within bounds",
    rangeFilter.pagination.limit > 0 && rangeFilter.pagination.limit <= 100,
  );
}