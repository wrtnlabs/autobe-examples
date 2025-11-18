import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCatalogTopSellingSkuStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCatalogTopSellingSkuStatistics";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";

/**
 * Validate that an authenticated admin can retrieve top-selling SKU statistics
 * using default request parameters, and that the response structure and basic
 * ranking semantics are correct.
 *
 * Business flow:
 *
 * 1. Register a new admin via POST /auth/admin/join.
 *
 *    - This returns IShoppingMallAdmin.IAuthorized and automatically applies the
 *         admin access token to the provided connection object.
 * 2. Call PATCH /shoppingMall/admin/catalog/statistics/topSellingSkus with an
 *    empty request body ({}), letting the backend apply its default analysis
 *    window and limit.
 * 3. Assert that the response matches IShoppingMallCatalogTopSellingSkuStatistics
 *    using typia.assert.
 * 4. For each statistics item, validate nested SKU, product, and seller summaries
 *    along with aggregate metrics (totalUnitsSold, totalRevenue,
 *    averageUnitPrice, rank).
 * 5. When there are multiple items, assert that ranks start from 1, increase
 *    strictly, and that totalUnitsSold is monotonically non-increasing with
 *    respect to rank (i.e., volume does not increase as rank increases).
 */
export async function test_api_admin_top_selling_skus_basic_flow(
  connection: api.IConnection,
) {
  // 1. Admin join & authentication
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const authorizedAdmin = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(authorizedAdmin);

  // 2. Call top-selling SKUs statistics endpoint with default request body
  const requestBody =
    {} satisfies IShoppingMallCatalogTopSellingSkuStatistics.IRequest;

  const stats =
    await api.functional.shoppingMall.admin.catalog.statistics.topSellingSkus.index(
      connection,
      { body: requestBody },
    );
  typia.assert<IShoppingMallCatalogTopSellingSkuStatistics>(stats);

  const items = stats.items;

  // Basic array shape validation
  await TestValidator.predicate("items is an array", async () =>
    Array.isArray(items),
  );

  if (items.length === 0) {
    // Valid case: no sales data yet
    TestValidator.equals("items length is zero when empty", items.length, 0);
    return;
  }

  // 3. Item-level validations for non-empty result sets
  for (const [index, item] of items.entries()) {
    const titlePrefix = `item[${index}]`;

    // SKU summary validations
    TestValidator.predicate(
      `${titlePrefix} sku.id is non-empty`,
      typeof item.sku.id === "string" && item.sku.id.length > 0,
    );
    TestValidator.predicate(
      `${titlePrefix} sku.code is non-empty`,
      typeof item.sku.code === "string" && item.sku.code.length > 0,
    );
    TestValidator.predicate(
      `${titlePrefix} sku.name is non-empty`,
      typeof item.sku.name === "string" && item.sku.name.length > 0,
    );

    // Product summary validations
    TestValidator.predicate(
      `${titlePrefix} product.id is non-empty`,
      typeof item.product.id === "string" && item.product.id.length > 0,
    );
    TestValidator.predicate(
      `${titlePrefix} product.name is non-empty`,
      typeof item.product.name === "string" && item.product.name.length > 0,
    );
    TestValidator.predicate(
      `${titlePrefix} product minPrice is non-negative`,
      typeof item.product.minPrice === "number" && item.product.minPrice >= 0,
    );
    TestValidator.predicate(
      `${titlePrefix} product maxPrice is non-negative`,
      typeof item.product.maxPrice === "number" && item.product.maxPrice >= 0,
    );
    TestValidator.predicate(
      `${titlePrefix} product maxPrice >= minPrice`,
      item.product.maxPrice >= item.product.minPrice,
    );
    TestValidator.predicate(
      `${titlePrefix} product currency has length 3`,
      typeof item.product.currency === "string" &&
        item.product.currency.length === 3,
    );

    // Seller summary validations
    TestValidator.predicate(
      `${titlePrefix} seller.id is non-empty`,
      typeof item.seller.id === "string" && item.seller.id.length > 0,
    );
    TestValidator.predicate(
      `${titlePrefix} seller.email is non-empty`,
      typeof item.seller.email === "string" && item.seller.email.length > 0,
    );
    TestValidator.predicate(
      `${titlePrefix} seller.status is non-empty`,
      typeof item.seller.status === "string" && item.seller.status.length > 0,
    );
    TestValidator.predicate(
      `${titlePrefix} seller.emailVerified is boolean`,
      typeof item.seller.emailVerified === "boolean",
    );
    TestValidator.predicate(
      `${titlePrefix} seller.createdAt is non-empty`,
      typeof item.seller.createdAt === "string" &&
        item.seller.createdAt.length > 0,
    );

    // Metric validations
    TestValidator.predicate(
      `${titlePrefix} totalUnitsSold is non-negative integer`,
      typeof item.totalUnitsSold === "number" &&
        Number.isInteger(item.totalUnitsSold) &&
        item.totalUnitsSold >= 0,
    );
    TestValidator.predicate(
      `${titlePrefix} totalRevenue is non-negative`,
      typeof item.totalRevenue === "number" && item.totalRevenue >= 0,
    );
    TestValidator.predicate(
      `${titlePrefix} averageUnitPrice is non-negative`,
      typeof item.averageUnitPrice === "number" && item.averageUnitPrice >= 0,
    );
    TestValidator.predicate(
      `${titlePrefix} rank is integer >= 1`,
      typeof item.rank === "number" &&
        Number.isInteger(item.rank) &&
        item.rank >= 1,
    );
  }

  if (items.length >= 2) {
    // 4. Ranking order & totalUnitsSold monotonicity validations
    TestValidator.equals("first item rank starts from 1", items[0].rank, 1);

    for (let i = 0; i < items.length - 1; i++) {
      const current = items[i];
      const next = items[i + 1];

      TestValidator.predicate(
        `rank strictly increases between items[${i}] and items[${i + 1}]`,
        next.rank > current.rank,
      );

      TestValidator.predicate(
        `totalUnitsSold does not increase from items[${i}] to items[${i + 1}]`,
        next.totalUnitsSold <= current.totalUnitsSold,
      );
    }
  }
}
