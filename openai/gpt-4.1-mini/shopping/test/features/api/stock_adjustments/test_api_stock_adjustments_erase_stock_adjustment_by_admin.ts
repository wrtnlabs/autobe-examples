import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductApproval";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallStockAdjustment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallStockAdjustment";

/**
 * Test the complete workflow for deleting a stock adjustment record by its
 * unique ID in the shopping mall platform.
 *
 * This test verifies the entire lifecycle of a stock adjustment from creation
 * to deletion by an admin user. It covers authentication, product and SKU
 * creation, stock adjustment creation, and secure deletion.
 *
 * Steps:
 *
 * 1. Create a new admin user.
 * 2. Login as the admin to obtain access tokens.
 * 3. Create a product.
 * 4. Create a SKU variant for the product.
 * 5. Create a stock adjustment record linked to the SKU.
 * 6. Delete the stock adjustment record by its ID.
 * 7. Attempt to delete the same record again to confirm deletion.
 *
 * This validates admin-only permissions and correct backend behavior for this
 * sensitive operation.
 */
export async function test_api_stock_adjustments_erase_stock_adjustment_by_admin(
  connection: api.IConnection,
) {
  // Step 1-2: Create and authenticate admin user
  const adminEmail = `${RandomGenerator.alphabets(5)}@example.com`;
  const adminJoinBody = {
    email: adminEmail,
    password: "StrongPass123!",
    full_name: RandomGenerator.name(),
  } satisfies IShoppingMallAdmin.IJoin;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(admin);

  // Step 3: Create a product
  const productCreateBody = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 3,
      wordMax: 8,
    }),
    brand: RandomGenerator.name(),
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.admin.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);
  TestValidator.equals(
    "product code matches",
    product.code,
    productCreateBody.code,
  );

  // Step 4: Create a SKU variant
  const skuCreateBody = {
    sku_code: RandomGenerator.alphaNumeric(10),
    price: Number((Math.random() * 1000 + 10).toFixed(2)),
    attributes_json: JSON.stringify({ color: "red", size: "M" }),
  } satisfies IShoppingMallProductSku.ICreate;

  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.admin.products.skus.createSku(
      connection,
      { productCode: product.code, body: skuCreateBody },
    );
  typia.assert(sku);
  TestValidator.equals(
    "sku code matches",
    sku.sku_code,
    skuCreateBody.sku_code,
  );

  // Step 5: Create a stock adjustment record
  const stockAdjustmentCreateBody = {
    shopping_mall_product_sku_id: sku.id,
    adjustment_type: "addition",
    quantity: 100,
    actor_type: "admin",
    actor_id: admin.id,
  } satisfies IShoppingMallStockAdjustment.ICreate;

  const stockAdjustment: IShoppingMallStockAdjustment =
    await api.functional.shoppingMall.admin.stockAdjustments.create(
      connection,
      { body: stockAdjustmentCreateBody },
    );
  typia.assert(stockAdjustment);
  TestValidator.equals(
    "stock adjustment sku id matches",
    stockAdjustment.shopping_mall_product_sku_id,
    sku.id,
  );

  // Step 6: Delete the stock adjustment record by id
  await api.functional.shoppingMall.admin.stockAdjustments.eraseStockAdjustment(
    connection,
    { id: stockAdjustment.id },
  );

  // Step 7: Attempt to delete the same record again, expecting error
  await TestValidator.error(
    "deleting non-existent stock adjustment should fail",
    async () => {
      await api.functional.shoppingMall.admin.stockAdjustments.eraseStockAdjustment(
        connection,
        { id: stockAdjustment.id },
      );
    },
  );
}
