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
 * Test the complete workflow of creating a new SKU variant for a specified
 * product by an authorized seller.
 *
 * This test covers the following key business operations:
 *
 * 1. Register a new seller account and authenticate to get authorization token.
 * 2. Create a product category for product classification.
 * 3. Create a new product owned by the authenticated seller in the created
 *    category.
 * 4. Create a new SKU variant for the product with valid details including price,
 *    unique SKU code, status, and optional weight.
 *
 * The test validates the success of each operation by asserting the returned
 * entities against expected values, focusing on type safety and business logic
 * correctness. It ensures that the seller can securely and correctly manage
 * product SKUs.
 */
export async function test_api_shoppingmall_sku_creation_by_seller(
  connection: api.IConnection,
) {
  // 1. Register a new seller
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const newSeller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password_hash: RandomGenerator.alphaNumeric(32),
        company_name: RandomGenerator.name(),
        contact_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        status: "active",
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(newSeller);

  // 2. Create a product category
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.shoppingMall.categories.create(
      connection,
      {
        body: {
          parent_id: null,
          code: `CAT-${RandomGenerator.alphaNumeric(6)}`,
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          display_order: Math.floor(Math.random() * 100),
        } satisfies IShoppingMallCategory.ICreate,
      },
    );
  typia.assert(category);

  // 3. Create a new product owned by the authenticated seller
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: {
        shopping_mall_category_id: category.id,
        shopping_mall_seller_id: newSeller.id,
        code: `PROD-${RandomGenerator.alphaNumeric(8)}`,
        name: RandomGenerator.name(),
        description: RandomGenerator.content({ paragraphs: 2 }),
        status: "Active",
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(product);

  // 4. Create a new SKU variant for the product
  const skuPrice = Math.floor(Math.random() * 100000) / 100 + 1; // price > 0
  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id,
      body: {
        shopping_mall_product_id: product.id,
        sku_code: `SKU-${RandomGenerator.alphaNumeric(6)}`,
        price: skuPrice,
        weight:
          Math.random() > 0.5
            ? parseFloat((Math.random() * 10).toFixed(2))
            : null,
        status: "Active",
      } satisfies IShoppingMallSku.ICreate,
    });
  typia.assert(sku);

  // Assert key properties
  TestValidator.equals(
    "sku product id matches",
    sku.shopping_mall_product_id,
    product.id,
  );
  TestValidator.predicate("sku code is non-empty", sku.sku_code.length > 0);
  TestValidator.predicate("sku price is positive", sku.price > 0);
  TestValidator.equals("sku status is 'Active'", sku.status, "Active");
}
