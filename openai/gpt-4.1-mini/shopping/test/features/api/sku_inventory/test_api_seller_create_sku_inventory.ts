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
import type { IShoppingMallSkuInventory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuInventory";

/**
 * Test SKU Inventory Creation Workflow
 *
 * This test validates the process of creating SKU inventory entries in the
 * shopping mall system for managing stock levels of product SKUs by an
 * authenticated seller.
 *
 * Workflow Steps:
 *
 * 1. Register a new seller and authenticate
 * 2. Create a new product with a unique product code
 * 3. Create one or more SKUs for the product
 * 4. Create multiple SKU inventory records for the created SKUs, specifying
 *    quantity and stock status
 * 5. Validate successful creation and correct server-side storage
 */
export async function test_api_seller_create_sku_inventory(
  connection: api.IConnection,
) {
  // 1. Seller registration and authentication
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: "Password123!", // a secure valid password
        store_name: `Store_${RandomGenerator.paragraph({ sentences: 2, wordMin: 4, wordMax: 8 })}`,
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // 2. Create a new product for the seller
  const productCode = `PRD-${RandomGenerator.alphaNumeric(8).toUpperCase()}`;
  const productCreateBody = {
    code: productCode,
    name: `Product ${RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 })}`,
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: `Brand ${RandomGenerator.name(1)}`,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);
  TestValidator.equals("product code matches", product.code, productCode);

  // 3. Create SKUs for the product
  const sku1CreateBody = {
    sku_code: `SKU-${RandomGenerator.alphaNumeric(6).toUpperCase()}`,
    price: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    attributes_json: JSON.stringify({ color: "red", size: "M" }),
  } satisfies IShoppingMallProductSku.ICreate;

  const sku1: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.createSku(
      connection,
      {
        productCode: productCode,
        body: sku1CreateBody,
      },
    );
  typia.assert(sku1);
  TestValidator.equals(
    "sku1 sku_code matches",
    sku1.sku_code,
    sku1CreateBody.sku_code,
  );

  const sku2CreateBody = {
    sku_code: `SKU-${RandomGenerator.alphaNumeric(6).toUpperCase()}`,
    price: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    attributes_json: JSON.stringify({ color: "blue", size: "L" }),
  } satisfies IShoppingMallProductSku.ICreate;

  const sku2: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.createSku(
      connection,
      {
        productCode: productCode,
        body: sku2CreateBody,
      },
    );
  typia.assert(sku2);
  TestValidator.equals(
    "sku2 sku_code matches",
    sku2.sku_code,
    sku2CreateBody.sku_code,
  );

  // 4. Create SKU inventory records for the SKUs
  const inventoryStatuses = [
    "in stock",
    "out of stock",
    "backordered",
  ] as const;

  const inventory1CreateBody = {
    shopping_mall_product_sku_id: sku1.id,
    quantity: RandomGenerator.pick([100, 50, 0]),
    stock_status: inventoryStatuses[0], // in stock
  } satisfies IShoppingMallSkuInventory.ICreate;

  const inventory1: IShoppingMallSkuInventory =
    await api.functional.shoppingMall.seller.skuInventories.create(connection, {
      body: inventory1CreateBody,
    });
  typia.assert(inventory1);
  TestValidator.equals(
    "inventory1 SKU ID matches",
    inventory1.shopping_mall_product_sku_id,
    sku1.id,
  );
  TestValidator.predicate(
    "inventory1 quantity is non-negative",
    inventory1.quantity >= 0,
  );

  const inventory2CreateBody = {
    shopping_mall_product_sku_id: sku2.id,
    quantity: 0,
    stock_status: inventoryStatuses[1], // out of stock
  } satisfies IShoppingMallSkuInventory.ICreate;

  const inventory2: IShoppingMallSkuInventory =
    await api.functional.shoppingMall.seller.skuInventories.create(connection, {
      body: inventory2CreateBody,
    });
  typia.assert(inventory2);
  TestValidator.equals(
    "inventory2 SKU ID matches",
    inventory2.shopping_mall_product_sku_id,
    sku2.id,
  );
  TestValidator.equals("inventory2 quantity is zero", inventory2.quantity, 0);
  TestValidator.equals(
    "inventory2 stock status",
    inventory2.stock_status,
    "out of stock",
  );

  const inventory3CreateBody = {
    shopping_mall_product_sku_id: sku2.id,
    quantity: 20,
    stock_status: inventoryStatuses[2], // backordered
  } satisfies IShoppingMallSkuInventory.ICreate;

  const inventory3: IShoppingMallSkuInventory =
    await api.functional.shoppingMall.seller.skuInventories.create(connection, {
      body: inventory3CreateBody,
    });
  typia.assert(inventory3);
  TestValidator.equals(
    "inventory3 SKU ID matches",
    inventory3.shopping_mall_product_sku_id,
    sku2.id,
  );
  TestValidator.equals("inventory3 quantity is 20", inventory3.quantity, 20);
  TestValidator.equals(
    "inventory3 stock status",
    inventory3.stock_status,
    "backordered",
  );
}
