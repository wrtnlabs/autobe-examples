import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test permanently deleting a product from the product catalog by a seller.
 *
 * This test covers the entire process:
 *
 * 1. Seller joins (registration) with plain password.
 * 2. Seller logs in to obtain authentication.
 * 3. Admin joins and logs in for category and seller management.
 * 4. Admin creates a product category.
 * 5. Seller creates a product assigned to the created category.
 * 6. Seller deletes the product.
 * 7. Verify that deleting again the same product throws an error.
 *
 * This tests authorization, data creation dependencies, and product deletion.
 */
export async function test_api_product_deletion_by_seller(
  connection: api.IConnection,
) {
  // Seller registration info with plain password
  const plainPassword = RandomGenerator.alphaNumeric(16);
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: plainPassword,
    company_name: RandomGenerator.name(),
    contact_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    status: "active",
  } satisfies IShoppingMallSeller.ICreate;

  // Seller join
  const sellerAuth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, { body: sellerJoinBody });
  typia.assert(sellerAuth);

  // Seller login with plain password
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerJoinBody.email,
      password: plainPassword,
    } satisfies IShoppingMallSeller.ILogin,
  });

  // Admin registration info and creation
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(16),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    status: "active",
  } satisfies IShoppingMallAdmin.ICreate;

  // Admin join
  const adminAuth: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(adminAuth);

  // Admin login
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminJoinBody.email,
      password: adminJoinBody.password_hash,
      type: "admin",
    } satisfies IShoppingMallAdmin.ILogin,
  });

  // Admin creates product category
  const categoryBody = {
    parent_id: null,
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 10 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    display_order: 1,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.shoppingMall.categories.create(
      connection,
      { body: categoryBody },
    );
  typia.assert(category);

  // Seller creates product assigned to category
  const productBody = {
    shopping_mall_category_id: category.id,
    shopping_mall_seller_id: sellerAuth.id,
    code: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.paragraph({ sentences: 4 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    status: "Draft",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert(product);

  // Seller deletes the product
  await api.functional.shoppingMall.seller.products.erase(connection, {
    productId: product.id,
  });

  // Verify deletion by attempting to delete again and expect error
  await TestValidator.error(
    "retrieving deleted product should fail",
    async () => {
      await api.functional.shoppingMall.seller.products.erase(connection, {
        productId: product.id,
      });
    },
  );
}
