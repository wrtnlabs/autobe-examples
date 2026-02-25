import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReview";
import type { IEcommerceReviewReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReviewReport";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceReviewReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceReviewReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test administrator pagination behavior when filtering yields minimal or no results.
 * Authenticate as administrator, apply specific filters that yield few or zero results.
 * Verify pagination metadata correctly indicates page counts, empty data arrays, and
 * proper handling of out-of-bounds page requests. Validate consistency between
 * pagination headers and actual result counts.
 */
export async function test_api_review_reports_pagination_with_empty_results(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceAdministrator.IJoin,
  });
  // Test 1: Filter by non-existent customer_id (should yield zero results)
  const nonExistentCustomerId = typia.random<string & tags.Format<"uuid">>();
  const emptyResults =
    await api.functional.ecommerce.administrator.review_reports.index(
      adminConnection,
      {
        body: {
          customer_id: nonExistentCustomerId,
          page: 1,
          limit: 20,
        } satisfies IEcommerceReviewReport.IRequest,
      },
    );
  typia.assert(emptyResults);
  // Validate empty results pagination metadata
  TestValidator.equals("empty results data array", emptyResults.data.length, 0);
  TestValidator.equals(
    "total records should be 0",
    emptyResults.pagination.records,
    0,
  );
  TestValidator.equals(
    "total pages should be 0",
    emptyResults.pagination.pages,
    0,
  );
  TestValidator.equals(
    "current page should be 1",
    emptyResults.pagination.current,
    1,
  );
  TestValidator.equals("limit should be 20", emptyResults.pagination.limit, 20);
  // Test 2: Filter by non-existent review_id (should yield zero results)
  const nonExistentReviewId = typia.random<string & tags.Format<"uuid">>();
  const emptyResults2 =
    await api.functional.ecommerce.administrator.review_reports.index(
      adminConnection,
      {
        body: {
          review_id: nonExistentReviewId,
          page: 1,
          limit: 10,
        } satisfies IEcommerceReviewReport.IRequest,
      },
    );
  typia.assert(emptyResults2);
  // Validate empty results pagination metadata
  TestValidator.equals(
    "empty results2 data array",
    emptyResults2.data.length,
    0,
  );
  TestValidator.equals(
    "total records should be 0",
    emptyResults2.pagination.records,
    0,
  );
  TestValidator.equals(
    "total pages should be 0",
    emptyResults2.pagination.pages,
    0,
  );
  TestValidator.equals(
    "current page should be 1",
    emptyResults2.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit should be 10",
    emptyResults2.pagination.limit,
    10,
  );
  // Test 3: Filter by non-existent report category (should yield zero results)
  const nonExistentCategory = RandomGenerator.alphabets(10);
  const emptyResults3 =
    await api.functional.ecommerce.administrator.review_reports.index(
      adminConnection,
      {
        body: {
          report_category: nonExistentCategory,
          page: 1,
          limit: 5,
        } satisfies IEcommerceReviewReport.IRequest,
      },
    );
  typia.assert(emptyResults3);
  // Validate empty results pagination metadata
  TestValidator.equals(
    "empty results3 data array",
    emptyResults3.data.length,
    0,
  );
  TestValidator.equals(
    "total records should be 0",
    emptyResults3.pagination.records,
    0,
  );
  TestValidator.equals(
    "total pages should be 0",
    emptyResults3.pagination.pages,
    0,
  );
  TestValidator.equals(
    "current page should be 1",
    emptyResults3.pagination.current,
    1,
  );
  TestValidator.equals("limit should be 5", emptyResults3.pagination.limit, 5);
  // Test 4: Out-of-bounds page request (page 100 with no results)
  const outOfBoundsResults =
    await api.functional.ecommerce.administrator.review_reports.index(
      adminConnection,
      {
        body: {
          customer_id: nonExistentCustomerId,
          page: 100,
          limit: 20,
        } satisfies IEcommerceReviewReport.IRequest,
      },
    );
  typia.assert(outOfBoundsResults);
  // Validate out-of-bounds pagination metadata
  TestValidator.equals(
    "out-of-bounds data array",
    outOfBoundsResults.data.length,
    0,
  );
  TestValidator.equals(
    "total records should be 0",
    outOfBoundsResults.pagination.records,
    0,
  );
  TestValidator.equals(
    "total pages should be 0",
    outOfBoundsResults.pagination.pages,
    0,
  );
  TestValidator.equals(
    "current page should be 100",
    outOfBoundsResults.pagination.current,
    100,
  );
  TestValidator.equals(
    "limit should be 20",
    outOfBoundsResults.pagination.limit,
    20,
  );
  // Test 5: Future date range filter (should yield zero results)
  const futureDate = new Date(Date.now() + 86400000).toISOString(); // Tomorrow
  const futureResults =
    await api.functional.ecommerce.administrator.review_reports.index(
      adminConnection,
      {
        body: {
          created_at_from: futureDate,
          page: 1,
          limit: 20,
        } satisfies IEcommerceReviewReport.IRequest,
      },
    );
  typia.assert(futureResults);
  // Validate future date range pagination metadata
  TestValidator.equals(
    "future results data array",
    futureResults.data.length,
    0,
  );
  TestValidator.equals(
    "total pages should be 0",
    futureResults.pagination.pages,
    0,
  );
  TestValidator.equals(
    "current page should be 1",
    futureResults.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit should be 20",
    futureResults.pagination.limit,
    20,
  );
}
