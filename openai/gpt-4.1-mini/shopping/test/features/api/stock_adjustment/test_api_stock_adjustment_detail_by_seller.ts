import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductApproval";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSession";
import type { IShoppingMallStockAdjustment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallStockAdjustment";

/**
 * E2E test to validate detailed stock adjustment retrieval by ID as a seller.
 *
 * The full test covers:
 *
 * 1. Seller registration and authentication.
 * 2. Product creation with unique code and descriptive information.
 * 3. Product SKU creation with unique SKU code, price, and variant attributes.
 * 4. Stock adjustment creation for the SKU, with 'addition' adjustment type,
 *    quantity > 0, and actor as the seller.
 * 5. Retrieving the stock adjustment by its unique ID.
 * 6. Ensuring retrieved data matches exactly the created stock adjustment
 *    including SKU ID, adjustment type, quantity, actor type, actor ID, and
 *    created_at timestamp.
 */
export async function test_api_stock_adjustment_detail_by_seller(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new seller account
  const sellerBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "StrongP@ssw0rd",
    store_name: RandomGenerator.name(2),
  } satisfies IShoppingMallSeller.ICreate;
  const seller = await api.functional.auth.seller.join(connection, {
    body: sellerBody,
  });
  typia.assert(seller);

  // 2. Create a product
  const productBody = {
    code: `PROD-${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.name(3),
    description: RandomGenerator.content({ paragraphs: 1 }),
    brand: RandomGenerator.name(1),
  } satisfies IShoppingMallProduct.ICreate;
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    { body: productBody },
  );
  typia.assert(product);

  // 3. Create a product SKU
  const skuBody = {
    sku_code: `SKU-${RandomGenerator.alphaNumeric(6)}`,
    price: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    attributes_json: JSON.stringify({
      color: RandomGenerator.pick(["red", "green", "blue"] as const),
      size: RandomGenerator.pick(["S", "M", "L"] as const),
    }),
  } satisfies IShoppingMallProductSku.ICreate;
  const sku = await api.functional.shoppingMall.seller.products.skus.createSku(
    connection,
    { productCode: product.code, body: skuBody },
  );
  typia.assert(sku);

  // 4. Create stock adjustment
  const adjustmentBody = {
    shopping_mall_product_sku_id: sku.id,
    adjustment_type: "addition",
    quantity: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    actor_type: "seller",
    actor_id: seller.id,
  } satisfies IShoppingMallStockAdjustment.ICreate;
  const adjustment =
    await api.functional.shoppingMall.seller.stockAdjustments.create(
      connection,
      { body: adjustmentBody },
    );
  typia.assert(adjustment);

  // 5. Retrieve stock adjustment by ID
  const retrievedAdjustment =
    await api.functional.shoppingMall.seller.stockAdjustments.at(connection, {
      id: adjustment.id,
    });
  typia.assert(retrievedAdjustment);

  // 6. Verify that retrieved data matches created adjustment
  TestValidator.equals(
    "stock adjustment ID matches",
    retrievedAdjustment.id,
    adjustment.id,
  );
  TestValidator.equals(
    "SKU ID matches",
    retrievedAdjustment.shopping_mall_product_sku_id,
    sku.id,
  );
  TestValidator.equals(
    "adjustment type matches",
    retrievedAdjustment.adjustment_type,
    adjustmentBody.adjustment_type,
  );
  TestValidator.equals(
    "quantity matches",
    retrievedAdjustment.quantity,
    adjustmentBody.quantity,
  );
  TestValidator.equals(
    "actor type matches",
    retrievedAdjustment.actor_type,
    adjustmentBody.actor_type,
  );
  TestValidator.equals(
    "actor ID matches",
    retrievedAdjustment.actor_id,
    seller.id,
  );
  TestValidator.equals(
    "creation timestamp matches",
    retrievedAdjustment.created_at,
    adjustment.created_at,
  );
}
