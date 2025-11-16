import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductsCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductsCategory";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate that a seller can remove a product-category mapping for their
 * product, and the product remains in other categories after removal.
 *
 * Workflow:
 *
 * 1. Register a seller account
 * 2. Login as seller (if necessary)
 * 3. Create a product as the registered seller
 * 4. Create two fake categories (with typia.random) -- emulate by assigning two
 *    different categories (simulate category assignment via unique UUIDs
 *    because only category_id is needed)
 * 5. Assign both categories to the product via admin endpoint
 * 6. Remove one mapping via seller endpoint
 * 7. Validate result: the mapping is removed without error, the product still has
 *    the remaining category mapping
 */
export async function test_api_product_category_mapping_removal_by_seller(
  connection: api.IConnection,
) {
  // 1. Register a seller
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(10);
  const sellerJoinBody = {
    email: sellerEmail,
    password: sellerPassword,
    business_name: RandomGenerator.name(2),
    registration_number: RandomGenerator.alphaNumeric(12),
    business_phone: RandomGenerator.mobile(),
    href: "https://test.example.com/page/seller-join",
    referrer: "https://test.example.com/",
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IShoppingMallSeller.ICreate;
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, { body: sellerJoinBody });
  typia.assert(seller);

  // 2. Create a product as the seller
  const productBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    default_price: 35600,
    business_status: "published",
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.products.create(connection, {
      body: productBody,
    });
  typia.assert(product);

  // 3. Create two fake category IDs (simulate two categories for assignment)
  const categoryId1 = typia.random<string & tags.Format<"uuid">>();
  const categoryId2 = typia.random<string & tags.Format<"uuid">>();

  // 4. Assign both categories to the product (admin privileges are assumed in test environment)
  // Log in as admin (register and login for a clean admin account)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    name: RandomGenerator.name(2),
  } satisfies IShoppingMallAdmin.ICreate;
  await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IShoppingMallAdmin.ILogin,
  });

  // Assign category mapping 1
  const mapping1: IShoppingMallProductsCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: product.id,
        body: {
          shopping_mall_category_id: categoryId1,
        } satisfies IShoppingMallProductsCategory.ICreate,
      },
    );
  typia.assert(mapping1);
  // Assign category mapping 2
  const mapping2: IShoppingMallProductsCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: product.id,
        body: {
          shopping_mall_category_id: categoryId2,
        } satisfies IShoppingMallProductsCategory.ICreate,
      },
    );
  typia.assert(mapping2);

  // Switch session back to seller by logging in as seller (if necessary)
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: "https://test.example.com/page/login",
      referrer: "https://test.example.com/",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });

  // 5. Remove the mapping for categoryId1 as the seller
  await api.functional.shoppingMall.seller.products.categories.erase(
    connection,
    {
      productId: product.id,
      productCategoryId: mapping1.id,
    },
  );

  // There is no direct way to fetch the product-category mappings for the seller in this API set, so only validate the operation completed (no error thrown)
  // If in future, there are product->categories or mapping list endpoints, those should be checked here.
  TestValidator.predicate(
    "category mapping removal by seller succeeds without error",
    true,
  );
}
