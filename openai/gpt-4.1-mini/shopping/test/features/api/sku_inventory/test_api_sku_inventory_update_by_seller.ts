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

export async function test_api_sku_inventory_update_by_seller(
  connection: api.IConnection,
) {
  // 1. Seller registers and authenticates
  const sellerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: "StrongPassword123!",
        store_name: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 4,
          wordMax: 8,
        }),
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // 2. Seller creates a product
  const productCreateBody = {
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.paragraph({ sentences: 4, wordMin: 3, wordMax: 7 }),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 8,
      wordMin: 4,
      wordMax: 7,
    }),
    brand: RandomGenerator.name(),
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  // 3. Seller creates a SKU for the product
  const skuCreateBody = {
    sku_code: RandomGenerator.alphaNumeric(12),
    price: Math.max(
      1,
      Math.floor(
        typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100000>
        >(),
      ),
    ),
    attributes_json: JSON.stringify({
      color: RandomGenerator.pick(["red", "blue", "green"] as const),
      size: RandomGenerator.pick(["S", "M", "L", "XL"] as const),
    }),
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

  // 4. Seller creates a SKU inventory record to be updated later
  const inventoryCreateBody = {
    shopping_mall_product_sku_id: sku.id,
    quantity: Math.max(
      0,
      Math.floor(
        typia.random<
          number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<1000>
        >(),
      ),
    ),
    stock_status: "in stock",
  } satisfies IShoppingMallSkuInventory.ICreate;
  const inventory: IShoppingMallSkuInventory =
    await api.functional.shoppingMall.seller.skuInventories.create(connection, {
      body: inventoryCreateBody,
    });
  typia.assert(inventory);

  // 5. Seller updates the SKU inventory
  const updatedQuantity = inventory.quantity + 50;
  const updatedStockStatus = "in stock";
  const inventoryUpdateBody = {
    quantity: updatedQuantity,
    stock_status: updatedStockStatus,
  } satisfies IShoppingMallSkuInventory.IUpdate;
  const updatedInventory: IShoppingMallSkuInventory =
    await api.functional.shoppingMall.seller.skuInventories.update(connection, {
      id: inventory.id,
      body: inventoryUpdateBody,
    });
  typia.assert(updatedInventory);

  // 6. Validate the update
  TestValidator.equals(
    "updated inventory quantity",
    updatedInventory.quantity,
    updatedQuantity,
  );
  TestValidator.equals(
    "updated inventory stock status",
    updatedInventory.stock_status,
    updatedStockStatus,
  );
}
