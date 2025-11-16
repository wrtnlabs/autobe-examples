import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallProductsCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductsCategory";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate that seller can update their own product SKU successfully.
 *
 * Steps:
 *
 * 1. Register seller account
 * 2. Seller creates a new product
 * 3. Seller creates a SKU for the product
 * 4. Seller updates the SKU (changes sku_code, price, stock, status)
 * 5. Assert response fields and audit trail
 */
export async function test_api_sku_update_by_seller_owner(
  connection: api.IConnection,
) {
  // 1. Register seller account
  const sellerReg: IShoppingMallSeller.ICreate = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    business_name: RandomGenerator.name(),
    registration_number: RandomGenerator.alphaNumeric(12),
    business_phone: RandomGenerator.mobile(),
    href: "https://example.com",
    referrer: "https://example.com/join",
    ip: undefined,
  };
  const auth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, { body: sellerReg });
  typia.assert(auth);

  // 2. Seller creates a product
  const prodReq = {
    title: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    default_price: Math.floor(Math.random() * 9000 + 1000),
    business_status: "draft",
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.products.create(connection, {
      body: prodReq,
    });
  typia.assert(product);

  // 3. Seller creates the SKU
  const skuReq = {
    sku_code: RandomGenerator.alphaNumeric(8),
    price: Math.floor(Math.random() * 5000 + 1000),
    stock: Math.floor(Math.random() * 99 + 1),
    status: "active",
  } satisfies IShoppingMallProductSku.ICreate;
  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id,
      body: skuReq,
    });
  typia.assert(sku);

  // 4. Update SKU: change all updatable fields
  const updateReq = {
    sku_code: RandomGenerator.alphaNumeric(10),
    price: sku.price + 100,
    stock: sku.stock + 3,
    status: "archived",
  } satisfies IShoppingMallProductSku.IUpdate;
  const updated: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.update(connection, {
      productId: product.id,
      skuId: sku.id,
      body: updateReq,
    });
  typia.assert(updated);

  // 5. Assert: updated fields & audit fields
  TestValidator.equals("sku id unchanged", updated.id, sku.id);
  TestValidator.notEquals("sku_code updated", updated.sku_code, sku.sku_code);
  TestValidator.equals("new sku_code", updated.sku_code, updateReq.sku_code);
  TestValidator.notEquals("price updated", updated.price, sku.price);
  TestValidator.equals("new price", updated.price, updateReq.price);
  TestValidator.notEquals("stock updated", updated.stock, sku.stock);
  TestValidator.equals("new stock", updated.stock, updateReq.stock);
  TestValidator.notEquals("status updated", updated.status, sku.status);
  TestValidator.equals("new status", updated.status, updateReq.status);
  // Audit fields
  TestValidator.notEquals(
    "updated_at changed",
    updated.updated_at,
    sku.updated_at,
  );
  TestValidator.equals("product id", updated.product.id, product.id);
  TestValidator.equals(
    "deleted_at is null (not deleted)",
    updated.deleted_at,
    null,
  );
}
