import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductVariant";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test administrator filtering product variants by stock availability.
 *
 * Validates the product variant listing endpoint with stock availability filtering. Ensures that administrators can filter variants by in_stock status and that the filtering logic correctly identifies variants with positive stock versus out-of-stock variants.
 *
 * The test verifies that the in_stock filter parameter properly filters variants based on their calculated stock quantity from inventory records, and that pagination metadata accurately reflects the filtered result counts.
 *
 * 1. Administrator account is created and authenticated.
 * 2. Admin retrieves variants with in_stock: true filter (positive stock only).
 * 3. Admin retrieves variants with in_stock: false filter (zero or negative stock only).
 * 4. Admin retrieves all variants without stock filter.
 * 5. Validates that filtering correctly separates in-stock and out-of-stock variants.
 * 6. Validates pagination metadata reflects correct filtered counts.
 * 7. Validates variant structure includes all required fields.
 */
export async function test_api_product_variant_admin_filter_by_stock(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: RandomGenerator.pick(["regular", "super"] as const),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // Generate a product ID for testing (in real scenario, product would exist)
  const productId = typia.random<string & tags.Format<"uuid">>();
  // 2. Get variants with in_stock: true (positive stock only)
  const inStockVariants =
    await api.functional.shoppingMall.admin.products.variants.index(
      adminConnection,
      {
        productId,
        body: {
          in_stock: true,
          page: 1,
          limit: 20,
        } satisfies IShoppingMallProductVariant.IRequest,
      },
    );
  typia.assert(inStockVariants);
  // 3. Get variants with in_stock: false (zero or negative stock only)
  const outOfStockVariants =
    await api.functional.shoppingMall.admin.products.variants.index(
      adminConnection,
      {
        productId,
        body: {
          in_stock: false,
          page: 1,
          limit: 20,
        } satisfies IShoppingMallProductVariant.IRequest,
      },
    );
  typia.assert(outOfStockVariants);
  // 4. Get all variants without stock filter
  const allVariants =
    await api.functional.shoppingMall.admin.products.variants.index(
      adminConnection,
      {
        productId,
        body: {
          page: 1,
          limit: 20,
        } satisfies IShoppingMallProductVariant.IRequest,
      },
    );
  typia.assert(allVariants);
  // 5. Validate in_stock: true returns only variants with positive stock_quantity
  for (const variant of inStockVariants.data) {
    TestValidator.predicate(
      "in-stock variant has positive stock_quantity",
      variant.stock_quantity > 0,
    );
  }
  // 6. Validate in_stock: false returns only variants with zero or negative stock_quantity
  for (const variant of outOfStockVariants.data) {
    TestValidator.predicate(
      "out-of-stock variant has zero or negative stock_quantity",
      variant.stock_quantity <= 0,
    );
  }
  // 7. Validate pagination metadata relationships
  TestValidator.predicate(
    "in-stock count does not exceed total",
    inStockVariants.pagination.records <= allVariants.pagination.records,
  );
  TestValidator.predicate(
    "out-of-stock count does not exceed total",
    outOfStockVariants.pagination.records <= allVariants.pagination.records,
  );
  TestValidator.predicate(
    "in-stock plus out-of-stock equals total records",
    inStockVariants.pagination.records +
      outOfStockVariants.pagination.records ===
      allVariants.pagination.records,
  );
}
