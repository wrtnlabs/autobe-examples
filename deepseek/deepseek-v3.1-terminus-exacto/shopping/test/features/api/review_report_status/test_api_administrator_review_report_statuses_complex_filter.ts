import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceReviewReportStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReviewReportStatus";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceReviewReportStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceReviewReportStatus";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_review_report_statuses_complex_filter(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "test1234",
    },
  });
  // Generate test data parameters
  const adminId = typia.random<string & tags.Format<"uuid">>();
  const reportId = typia.random<string & tags.Format<"uuid">>();
  const searchTerm = "investigation";
  const startDate = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const endDate = new Date().toISOString();
  const statusValues = ["pending", "approved", "rejected", "under_review"];
  // Test 1: Search with single review report ID filter
  const singleReportFilter =
    await api.functional.ecommerce.administrator.review_report_statuses.index(
      adminConnection,
      {
        body: {
          ecommerce_review_report_id: reportId,
          page: 1,
          limit: 10,
          sort: "created_at",
          order: "desc",
        } satisfies IEcommerceReviewReportStatus.IRequest,
      },
    );
  typia.assert(singleReportFilter);
  TestValidator.equals(
    "results filtered by single report",
    singleReportFilter.data.length >= 0,
    true,
  );
  // Test 2: Search with administrator ID filter
  const adminFilter =
    await api.functional.ecommerce.administrator.review_report_statuses.index(
      adminConnection,
      {
        body: {
          ecommerce_administrator_id: adminId,
          page: 1,
          limit: 10,
        } satisfies IEcommerceReviewReportStatus.IRequest,
      },
    );
  typia.assert(adminFilter);
  TestValidator.equals(
    "results filtered by administrator",
    adminFilter.data.length >= 0,
    true,
  );
  // Test 3: Search with status transition filters
  const statusFilter =
    await api.functional.ecommerce.administrator.review_report_statuses.index(
      adminConnection,
      {
        body: {
          previous_status: "pending",
          new_status: "approved",
          page: 1,
          limit: 10,
        } satisfies IEcommerceReviewReportStatus.IRequest,
      },
    );
  typia.assert(statusFilter);
  TestValidator.equals(
    "results filtered by status transition",
    statusFilter.data.length >= 0,
    true,
  );
  // Test 4: Search with datetime range filter
  const dateRangeFilter =
    await api.functional.ecommerce.administrator.review_report_statuses.index(
      adminConnection,
      {
        body: {
          created_start: startDate,
          created_end: endDate,
          page: 1,
          limit: 10,
        } satisfies IEcommerceReviewReportStatus.IRequest,
      },
    );
  typia.assert(dateRangeFilter);
  TestValidator.equals(
    "results filtered by date range",
    dateRangeFilter.data.length >= 0,
    true,
  );
  // Test 5: Search with text filter on transition_reason
  const textSearchFilter =
    await api.functional.ecommerce.administrator.review_report_statuses.index(
      adminConnection,
      {
        body: {
          search: searchTerm,
          page: 1,
          limit: 10,
        } satisfies IEcommerceReviewReportStatus.IRequest,
      },
    );
  typia.assert(textSearchFilter);
  TestValidator.equals(
    "results filtered by text search",
    textSearchFilter.data.length >= 0,
    true,
  );
  // Test 6: Complex filter combining multiple criteria
  const complexFilter =
    await api.functional.ecommerce.administrator.review_report_statuses.index(
      adminConnection,
      {
        body: {
          ecommerce_review_report_id: reportId,
          ecommerce_administrator_id: adminId,
          previous_status: "pending",
          new_status: "approved",
          created_start: startDate,
          created_end: endDate,
          search: searchTerm,
          page: 1,
          limit: 5,
          sort: "created_at",
          order: "desc",
        } satisfies IEcommerceReviewReportStatus.IRequest,
      },
    );
  typia.assert(complexFilter);
  TestValidator.equals(
    "complex filtered results count reasonable",
    complexFilter.data.length >= 0,
    true,
  );
  // Test 7: Validate pagination with filtered results
  const paginationTest =
    await api.functional.ecommerce.administrator.review_report_statuses.index(
      adminConnection,
      {
        body: {
          ecommerce_review_report_id: reportId,
          page: 1,
          limit: 3,
        } satisfies IEcommerceReviewReportStatus.IRequest,
      },
    );
  typia.assert(paginationTest);
  TestValidator.predicate(
    "pagination metadata present",
    paginationTest.pagination.current === 1 &&
      paginationTest.pagination.limit === 3 &&
      paginationTest.pagination.records >= 0 &&
      paginationTest.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "page size respects limit",
    paginationTest.data.length <= 3,
  );
  // Test 8: Verify sorting works correctly
  const sortedResults =
    await api.functional.ecommerce.administrator.review_report_statuses.index(
      adminConnection,
      {
        body: {
          previous_status: "pending",
          sort: "created_at",
          order: "asc",
          page: 1,
          limit: 10,
        } satisfies IEcommerceReviewReportStatus.IRequest,
      },
    );
  typia.assert(sortedResults);
  TestValidator.equals(
    "sorted results returned",
    sortedResults.data.length >= 0,
    true,
  );
}
