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
 * Test administrator search combining multiple filters - specific customer and date range.
 */
export async function test_api_review_reports_search_by_customer_and_date(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceAdministrator.IJoin,
  });
  typia.assert(adminAuth);
  // Generate a customer ID for filtering
  const customerId = typia.random<string & tags.Format<"uuid">>();
  // Generate date range for filtering
  const now = new Date();
  const created_at_from = new Date(
    now.getTime() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 7 days ago
  const created_at_to = new Date(
    now.getTime() - 1 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 1 day ago
  // 2. Search for review reports with customer and date filters
  const searchResults =
    await api.functional.ecommerce.administrator.review_reports.index(
      adminConnection,
      {
        body: {
          customer_id: customerId,
          created_at_from: created_at_from satisfies string &
            tags.Format<"date-time">,
          created_at_to: created_at_to satisfies string &
            tags.Format<"date-time">,
          page: 1 satisfies number &
            tags.Type<"int32"> &
            tags.Default<1> &
            tags.Minimum<1>,
          limit: 20 satisfies number &
            tags.Type<"int32"> &
            tags.Default<20> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IEcommerceReviewReport.IRequest,
      },
    );
  typia.assert(searchResults);
  // 3. Validate search results
  TestValidator.predicate(
    "has valid pagination structure",
    () =>
      searchResults.pagination.current >= 0 &&
      searchResults.pagination.limit >= 0 &&
      searchResults.pagination.records >= 0 &&
      searchResults.pagination.pages >= 0,
  );
  // 4. Validate that all returned reports match the customer ID filter
  for (const report of searchResults.data) {
    typia.assert(report);
    TestValidator.equals(
      "customer ID matches filter",
      report.customer.id,
      customerId,
    );
    TestValidator.predicate(
      "report timestamp within date range",
      () =>
        new Date(report.created_at) >= new Date(created_at_from) &&
        new Date(report.created_at) <= new Date(created_at_to),
    );
    // Validate business logic relationships
    TestValidator.predicate("customer email format", () =>
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(report.customer.email),
    );
    TestValidator.predicate(
      "review rating within valid range",
      () => report.review.rating >= 1 && report.review.rating <= 5,
    );
  }
}
