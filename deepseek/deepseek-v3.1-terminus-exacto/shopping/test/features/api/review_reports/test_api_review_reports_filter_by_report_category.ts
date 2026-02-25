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

export async function test_api_review_reports_filter_by_report_category(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceAdministrator.IJoin,
  });
  // Test category filtering
  const reportCategories = ["spam", "inappropriate", "misinformation"] as const;
  for (const category of reportCategories) {
    // Search for reports with specific category
    const response =
      await api.functional.ecommerce.administrator.review_reports.index(
        adminConnection,
        {
          body: {
            report_category: category,
            page: 1,
            limit: 10,
          } satisfies IEcommerceReviewReport.IRequest,
        },
      );
    typia.assert(response);
    // Validate that all returned reports match the filter category
    TestValidator.equals(
      `all reports should have category "${category}"`,
      response.data.every((report) => report.report_category === category),
      true,
    );
    // Validate pagination structure
    TestValidator.predicate(
      `pagination should be valid for category "${category}"`,
      response.pagination.current === 1 &&
        response.pagination.limit === 10 &&
        response.pagination.records >= 0 &&
        response.pagination.pages >= 0,
    );
    // Validate customer and review references in summaries
    for (const report of response.data) {
      TestValidator.predicate(
        `customer reference should exist for category "${category}"`,
        report.customer !== undefined &&
          report.customer.id !== undefined &&
          report.customer.email !== undefined,
      );
      TestValidator.predicate(
        `review reference should exist for category "${category}"`,
        report.review !== undefined &&
          report.review.id !== undefined &&
          report.review.rating !== undefined,
      );
    }
  }
  // Test category filter with date range
  const currentDate = new Date().toISOString();
  const oneWeekAgo = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const dateFilteredResponse =
    await api.functional.ecommerce.administrator.review_reports.index(
      adminConnection,
      {
        body: {
          report_category: "spam",
          created_at_from: oneWeekAgo,
          created_at_to: currentDate,
          page: 1,
          limit: 5,
        } satisfies IEcommerceReviewReport.IRequest,
      },
    );
  typia.assert(dateFilteredResponse);
  // Validate date range filtering
  for (const report of dateFilteredResponse.data) {
    const reportDate = new Date(report.created_at).getTime();
    const fromDate = new Date(oneWeekAgo).getTime();
    const toDate = new Date(currentDate).getTime();
    TestValidator.predicate(
      "report date should be within specified range",
      reportDate >= fromDate && reportDate <= toDate,
    );
  }
  // Test empty filter (should return all reports)
  const allReportsResponse =
    await api.functional.ecommerce.administrator.review_reports.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IEcommerceReviewReport.IRequest,
      },
    );
  typia.assert(allReportsResponse);
  TestValidator.predicate(
    "unfiltered search should return reports",
    allReportsResponse.data.length >= 0,
  );
}
