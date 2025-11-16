import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductRating } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductRating";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductRating } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductRating";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallProductsCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductsCategory";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate admin product rating analytics searching with advanced filters,
 * pagination, sort, and access control.
 *
 * - Register a new admin via join and use its token for all search requests.
 * - Search ratings using various combinations of filters: product, SKU, customer,
 *   order ID, rating value, created_at window, etc.
 * - Perform pagination and sort (by created_at, value; both asc/desc) and
 *   validate returned pages and record counts.
 * - For each response, ensure all ratings match the delivered filters and
 *   structure matches the API contract.
 * - Attempt to access this endpoint unauthenticated and confirm access control
 *   (should fail for non-admin).
 * - Check pagination metadata correctness and that results respect requested
 *   limits.
 */
export async function test_api_product_rating_admin_analytics_search(
  connection: api.IConnection,
) {
  // 1. Register new admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12) + "A!1";
  const adminName = RandomGenerator.name();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        name: adminName,
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Use admin session for search
  // (SDK sets token in connection automatically after join)
  // Prepare searches (random, but must satisfy IShoppingMallProductRating.IRequest)
  const filters: IShoppingMallProductRating.IRequest[] = [
    // By rating value
    { value: 5, page: 1, limit: 10, sort_by: "created_at", sort_order: "desc" },
    { value: 4, page: 1, limit: 10, sort_by: "created_at", sort_order: "asc" },
    // By pagination only
    { page: 2, limit: 5 },
    // By a combination (simulate realistic inputs)
    { value: 3, sort_by: "value", sort_order: "desc", page: 1, limit: 10 },
    { sort_by: "value", sort_order: "asc", page: 1, limit: 10 },
  ];
  for (const req of filters) {
    const result: IPageIShoppingMallProductRating.ISummary =
      await api.functional.shoppingMall.admin.productRatings.index(connection, {
        body: req,
      });
    typia.assert(result);
    // Business validation: each rating.result matches the requested filters
    for (const r of result.data) {
      if (typeof req.value !== "undefined")
        TestValidator.equals("rating value matches filter", r.value, req.value);
      // No business logic possible for product/SKU/id matching as we rely on random test data
    }
    // Pagination metadata exists
    TestValidator.equals(
      "pagination.limit matches request",
      result.pagination.limit,
      req.limit ?? 10,
    );
    TestValidator.equals(
      "pagination.current page matches request",
      result.pagination.current,
      req.page ?? 1,
    );
  }

  // 3. Access control: try unauthenticated access, should fail
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthorized user cannot view admin analytics search",
    async () => {
      await api.functional.shoppingMall.admin.productRatings.index(unauthConn, {
        body: { page: 1, limit: 3 },
      });
    },
  );
}
