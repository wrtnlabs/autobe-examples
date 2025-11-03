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

export async function test_api_stock_adjustment_create_by_seller(
  connection: api.IConnection,
) {
  // 1. Seller joins and authenticates
  const sellerBody = {
    email: RandomGenerator.alphaNumeric(8) + "@example.com",
    password: "sellerPass123",
    store_name: RandomGenerator.name(),
  } satisfies IShoppingMallSeller.ICreate;
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, { body: sellerBody });
  typia.assert(seller);

  // 2. Seller creates a product
  const productBody = {
    code: `P-${RandomGenerator.alphaNumeric(6).toUpperCase()}`,
    name: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 7 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    brand: RandomGenerator.name(),
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert(product);

  // 3. Seller creates a SKU under the product
  const skuBody = {
    sku_code: `SKU-${RandomGenerator.alphaNumeric(5).toUpperCase()}`,
    price: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    attributes_json: JSON.stringify({ color: "red", size: "M" }),
  } satisfies IShoppingMallProductSku.ICreate;
  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.createSku(
      connection,
      {
        productCode: product.code,
        body: skuBody,
      },
    );
  typia.assert(sku);

  // 4. Seller creates a stock adjustment for the SKU
  const adjustmentBody = {
    shopping_mall_product_sku_id: sku.id,
    adjustment_type: "addition",
    quantity: 100,
    actor_type: "seller",
    actor_id: seller.id,
  } satisfies IShoppingMallStockAdjustment.ICreate;

  const adjustment: IShoppingMallStockAdjustment =
    await api.functional.shoppingMall.seller.stockAdjustments.create(
      connection,
      { body: adjustmentBody },
    );
  typia.assert(adjustment);

  // 5. Validate linkage
  TestValidator.equals(
    "stock adjustment SKU id matches",
    adjustment.shopping_mall_product_sku_id,
    sku.id,
  );
  TestValidator.equals(
    "stock adjustment actor type is seller",
    adjustment.actor_type,
    "seller",
  );
  TestValidator.equals(
    "stock adjustment actor id matches seller",
    adjustment.actor_id,
    seller.id,
  );
  TestValidator.equals(
    "stock adjustment quantity is positive",
    adjustment.quantity > 0,
    true,
  );
  TestValidator.equals(
    "stock adjustment type is addition",
    adjustment.adjustment_type,
    "addition",
  );
}
