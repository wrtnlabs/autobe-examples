import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallLowStockAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallLowStockAlert";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductApproval";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSession";
import type { IShoppingMallSkuInventory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuInventory";

export async function test_api_low_stock_alert_update_by_seller(
  connection: api.IConnection,
) {
  // 1. Seller joins and authenticates
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: "1234",
        store_name: RandomGenerator.name(),
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // 2. Seller creates a product
  const productCreateBody = {
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    brand: RandomGenerator.name(),
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  // 3. Seller creates a SKU under the product
  const skuCreateBody = {
    sku_code: RandomGenerator.alphaNumeric(15),
    price: typia.random<number & tags.Type<"uint32"> & tags.Minimum<1>>(),
    attributes_json: JSON.stringify({ color: "red", size: "M" }),
  } satisfies IShoppingMallProductSku.ICreate;

  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.createSku(
      connection,
      {
        productCode: product.code,
        body: skuCreateBody,
      },
    );
  typia.assert(sku);

  // 4. Seller creates a SKU inventory record to generate low stock alert
  const skuInventoryCreateBody = {
    shopping_mall_product_sku_id: sku.id,
    quantity: 1,
    stock_status: "out of stock",
  } satisfies IShoppingMallSkuInventory.ICreate;

  const inventory: IShoppingMallSkuInventory =
    await api.functional.shoppingMall.seller.skuInventories.create(connection, {
      body: skuInventoryCreateBody,
    });
  typia.assert(inventory);

  // 5. Prepare to update low stock alert by setting resolved and resolved_at
  const resolvedAt = new Date().toISOString();
  const lowStockAlertUpdateBody = {
    resolved: true,
    resolved_at: resolvedAt,
    alerted_at: inventory.created_at,
    shopping_mall_product_sku_id: sku.id,
  } satisfies IShoppingMallLowStockAlert.IUpdate;

  // 6. Update the low stock alert
  // Note: Using inventory.id as low stock alert id due to lack of explicit id retrieval API
  const updatedLowStockAlert: IShoppingMallLowStockAlert =
    await api.functional.shoppingMall.seller.lowStockAlerts.update(connection, {
      id: inventory.id,
      body: lowStockAlertUpdateBody,
    });
  typia.assert(updatedLowStockAlert);

  // 7. Validate update results
  TestValidator.equals(
    "Low stock alert resolved flag updated",
    updatedLowStockAlert.resolved,
    true,
  );
  TestValidator.equals(
    "Low stock alert resolved_at updated",
    updatedLowStockAlert.resolved_at,
    resolvedAt,
  );
  TestValidator.equals(
    "Low stock alert SKU id matches",
    updatedLowStockAlert.shopping_mall_product_sku_id,
    sku.id,
  );
}
