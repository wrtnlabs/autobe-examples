import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProduct";
import type { IPagination } from "@ORGANIZATION/PROJECT-api/lib/structures/IPagination";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test retrieving product analytics with default filters as an authenticated administrator.
 *
 * Validates the product analytics endpoint when called with empty request body,
 * which applies default filter values: status defaults to ACTIVE, page defaults to 1,
 * and limit defaults to 20. The response contains aggregated product statistics
 * including total/active/deleted counts, price metrics, category and seller distributions,
 * and a paginated list of product summaries.
 *
 * **Default Filter Behavior:**
 * - status: ACTIVE (includes only products where deleted_at is null)
 * - page: 1 (first page of results)
 * - limit: 20 (20 items per page)
 *
 * **Response Structure:**
 * - Statistics: total_count, active_count, deleted_count, average/min/max price
 * - Distributions: category_distribution, seller_distribution arrays
 * - Data: paginated product items with summaries
 * - Pagination: metadata for navigating through results
 *
 * 1. Administrator registers using valid email/password/name credentials.
 * 2. Authenticate the admin to obtain JWT access token.
 * 3. Call PATCH /ecommerceMall/admin/admin/analytics/products with empty body.
 * 4. Validate response contains all required statistics and pagination metadata.
 * 5. Verify counts are non-negative and price metrics are valid numbers.
 */
export async function test_api_product_analytics_retrieval_default_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // 2. Call analytics endpoint with empty request body (uses default filters)
  const analyticsResponse =
    await api.functional.ecommerceMall.admin.admin.analytics.products.index(
      adminConnection,
      {
        body: {} satisfies IEcommerceMallProduct.IAnalytic.IRequest,
      },
    );
  typia.assert(analyticsResponse);
  // 3. Validate response structure - IPageIEcommerceMallProduct.IAnalytic has pagination and data
  const { pagination } = analyticsResponse;
  // When there is data, validate analytics properties from the first item
  if (analyticsResponse.data.length > 0) {
    const analytics = analyticsResponse.data[0];
    // Validate statistics counts are non-negative integers
    TestValidator.predicate(
      "total_count is non-negative",
      analytics.total_count >= 0,
    );
    TestValidator.predicate(
      "active_count is non-negative",
      analytics.active_count >= 0,
    );
    TestValidator.predicate(
      "deleted_count is non-negative",
      analytics.deleted_count >= 0,
    );
    // Validate counts relationship
    TestValidator.predicate(
      "total_count equals active_count plus deleted_count",
      analytics.total_count ===
        analytics.active_count + analytics.deleted_count,
    );
    // Validate price metrics are valid numbers
    TestValidator.predicate(
      "average_price is valid number",
      typeof analytics.average_price === "number",
    );
    TestValidator.predicate(
      "min_price is valid number",
      typeof analytics.min_price === "number",
    );
    TestValidator.predicate(
      "max_price is valid number",
      typeof analytics.max_price === "number",
    );
    // Validate price range is consistent
    TestValidator.predicate(
      "min_price <= average_price",
      analytics.min_price <= analytics.average_price,
    );
    TestValidator.predicate(
      "average_price <= max_price",
      analytics.average_price <= analytics.max_price,
    );
    TestValidator.predicate(
      "min_price <= max_price",
      analytics.min_price <= analytics.max_price,
    );
    // Validate distribution arrays exist and are arrays
    TestValidator.predicate(
      "category_distribution is array",
      Array.isArray(analytics.category_distribution),
    );
    TestValidator.predicate(
      "seller_distribution is array",
      Array.isArray(analytics.seller_distribution),
    );
    // Validate items array exists
    TestValidator.predicate("items is array", Array.isArray(analytics.items));
  }
  // Validate pagination metadata structure (IPage.IPagination: current, limit, records, pages)
  TestValidator.predicate(
    "pagination has current",
    typeof pagination.current === "number",
  );
  TestValidator.predicate(
    "pagination has limit",
    typeof pagination.limit === "number",
  );
  TestValidator.predicate(
    "pagination has records",
    typeof pagination.records === "number",
  );
  TestValidator.predicate(
    "pagination has pages",
    typeof pagination.pages === "number",
  );
  // Validate pagination values are consistent
  TestValidator.equals("current defaults to 1", pagination.current, 1);
  TestValidator.equals("limit defaults to 20", pagination.limit, 20);
  TestValidator.predicate("records >= 0", pagination.records >= 0);
  TestValidator.predicate("pages >= 0", pagination.pages >= 0);
}
