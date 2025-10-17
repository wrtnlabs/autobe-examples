import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";

/**
 * Test updating specific SKU details for a product by an authenticated seller.
 *
 * Workflow:
 *
 * 1. Seller registration and login
 * 2. Admin creation for multi-role context
 * 3. Create product category
 * 4. Create seller profile
 * 5. Create product
 * 6. Create SKU variants
 * 7. Update SKU
 *
 * Ensures authorized sellers can update their SKUs only and validates updated
 * SKU fields.
 */
export async function test_api_shoppingmall_sku_update_by_seller(
  connection: api.IConnection,
) {
  // 1. Seller registration and login
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password_hash: "hashedPassword1234",
        company_name: RandomGenerator.name(),
        contact_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        status: "active",
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // 2. Admin creation for multi-role context
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password_hash: "hashedPassword1234",
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        status: "active",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // 3. Create product category
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.shoppingMall.categories.create(
      connection,
      {
        body: {
          parent_id: null,
          code: RandomGenerator.alphaNumeric(10),
          name: RandomGenerator.name(),
          description: RandomGenerator.content({ paragraphs: 1 }),
          display_order: RandomGenerator.alphaNumeric(1).length,
        } satisfies IShoppingMallCategory.ICreate,
      },
    );
  typia.assert(category);

  // 4. Create seller profile
  const sellerProfile: IShoppingMallSeller =
    await api.functional.shoppingMall.admin.sellers.create(connection, {
      body: {
        email: sellerEmail,
        password_hash: "hashedPassword1234",
        company_name: RandomGenerator.name(),
        contact_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        status: "active",
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(sellerProfile);

  // 5. Create product
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: {
        shopping_mall_category_id: category.id,
        shopping_mall_seller_id: sellerProfile.id,
        code: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.name(),
        description: RandomGenerator.content({ paragraphs: 1 }),
        status: "Active",
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(product);

  // 6. Create SKU variant
  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id,
      body: {
        shopping_mall_product_id: product.id,
        sku_code: RandomGenerator.alphaNumeric(8),
        price: Math.floor(Math.random() * 100000) / 100,
        weight: Math.floor(Math.random() * 1000) / 100,
        status: "Active",
      } satisfies IShoppingMallSku.ICreate,
    });
  typia.assert(sku);

  // 7. Update SKU
  const updateSkuBody: IShoppingMallSku.IUpdate = {
    sku_code: RandomGenerator.alphaNumeric(10),
    price: Math.floor(Math.random() * 200000) / 100 + 1,
    weight: Math.floor(Math.random() * 500) / 100 + 0.1,
    status: "Active",
  };

  const updatedSku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.update(connection, {
      productId: product.id,
      skuId: sku.id,
      body: updateSkuBody,
    });
  typia.assert(updatedSku);

  // Validate updated fields
  TestValidator.equals(
    "sku code updated",
    updatedSku.sku_code,
    updateSkuBody.sku_code,
  );
  TestValidator.predicate(
    "sku price updated",
    updatedSku.price === updateSkuBody.price,
  );
  TestValidator.predicate(
    "sku weight updated",
    updatedSku.weight === updateSkuBody.weight,
  );
  TestValidator.equals(
    "sku status updated",
    updatedSku.status,
    updateSkuBody.status,
  );
}
