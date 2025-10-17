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
 * This test function validates the soft deletion (soft erase) of a SKU
 * associated with a specific product by an authenticated seller.
 *
 * The test procedure includes:
 *
 * 1. Admin user signs up via join authentication.
 * 2. Seller user signs up via join authentication.
 * 3. Admin creates a product category necessary for the product.
 * 4. Seller creates a product linked to the created category and themselves.
 * 5. Seller creates a SKU for the newly created product.
 * 6. Seller performs a soft delete operation on the created SKU.
 *
 * At each step, the test asserts successful API responses and uses typia.assert
 * to validate API response data structures.
 *
 * The test ensures data consistency, proper role authentication, and functional
 * correctness of the product SKU soft deletion flow.
 */
export async function test_api_product_sku_soft_delete_by_seller(
  connection: api.IConnection,
) {
  // 1. Admin user signs up
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password_hash: "hashedpassword123",
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        status: "active",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Seller user signs up
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password_hash: "hashedpassword123",
        company_name: "BestSeller Inc",
        contact_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        status: "active",
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // 3. Admin creates a product category
  const categoryDisplayOrder = Math.floor(Math.random() * 100) + 1;
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.shoppingMall.categories.create(
      connection,
      {
        body: {
          parent_id: null,
          code: RandomGenerator.alphaNumeric(8),
          name: "Test Category",
          description: "Category for testing products",
          display_order: categoryDisplayOrder,
        } satisfies IShoppingMallCategory.ICreate,
      },
    );
  typia.assert(category);

  // 4. Seller creates a product linked to the created category and themselves
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: {
        shopping_mall_category_id: category.id,
        shopping_mall_seller_id: seller.id,
        code: RandomGenerator.alphaNumeric(10),
        name: "Test Product",
        description: "Product for testing SKU deletion",
        status: "Draft",
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(product);

  // 5. Seller creates a SKU for the product
  const productSKU: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id,
      body: {
        shopping_mall_product_id: product.id,
        sku_code: RandomGenerator.alphaNumeric(8),
        price: 5000,
        weight: null,
        status: "Active",
      } satisfies IShoppingMallSku.ICreate,
    });
  typia.assert(productSKU);

  // 6. Seller performs a soft delete operation on the created SKU
  await api.functional.shoppingMall.seller.products.skus.erase(connection, {
    productId: product.id,
    skuId: productSKU.id,
  });
}
