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

export async function test_api_review_moderation_search_by_customer_and_category(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceAdministrator.IJoin,
  });
  typia.assert(admin);
  // Generate random customer IDs for filtering
  const targetCustomerId = typia.random<string & tags.Format<"uuid">>();
  const otherCustomerId = typia.random<string & tags.Format<"uuid">>();
  const targetCategory = "inappropriate";
  const otherCategory = "spam";
  // Test 1: Search by customer ID only
  const searchByCustomer =
    await api.functional.ecommerce.administrator.moderation.reviews.index(
      adminConnection,
      {
        body: {
          customer_id: targetCustomerId,
          page: 1,
          limit: 20,
        } satisfies IEcommerceReviewReport.IRequest,
      },
    );
  typia.assert(searchByCustomer);
  // Test 2: Search by category only
  const searchByCategory =
    await api.functional.ecommerce.administrator.moderation.reviews.index(
      adminConnection,
      {
        body: {
          report_category: targetCategory,
          page: 1,
          limit: 20,
        } satisfies IEcommerceReviewReport.IRequest,
      },
    );
  typia.assert(searchByCategory);
  // Test 3: Search by both customer ID and category
  const searchByBoth =
    await api.functional.ecommerce.administrator.moderation.reviews.index(
      adminConnection,
      {
        body: {
          customer_id: targetCustomerId,
          report_category: targetCategory,
          page: 1,
          limit: 20,
        } satisfies IEcommerceReviewReport.IRequest,
      },
    );
  typia.assert(searchByBoth);
  // Validate that filtering narrows results appropriately
  TestValidator.predicate(
    "customer filter should return subset of all reports",
    searchByCustomer.data.length <= searchByCategory.data.length ||
      searchByCustomer.data.length <= searchByBoth.data.length,
  );
  TestValidator.predicate(
    "category filter should return subset of all reports",
    searchByCategory.data.length <= searchByCustomer.data.length ||
      searchByCategory.data.length <= searchByBoth.data.length,
  );
  TestValidator.predicate(
    "combined filter should return smallest subset",
    searchByBoth.data.length <= searchByCustomer.data.length &&
      searchByBoth.data.length <= searchByCategory.data.length,
  );
  // Validate customer and review information in each summary
  for (const report of searchByBoth.data) {
    TestValidator.equals(
      "report should have customer information",
      typeof report.customer,
      "object",
    );
    TestValidator.predicate(
      "customer should have valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        report.customer.id,
      ),
    );
    TestValidator.equals(
      "report should have review information",
      typeof report.review,
      "object",
    );
    TestValidator.predicate(
      "review should have valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        report.review.id,
      ),
    );
  }
}
