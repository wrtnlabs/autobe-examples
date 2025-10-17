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
 * Test detailed retrieval of a product with full validation of category and
 * seller info.
 *
 * Steps:
 *
 * 1. Seller role joins and logs in.
 * 2. Admin role joins, logs in and creates a product category.
 * 3. Admin role creates a seller entity.
 * 4. Seller logs in again.
 * 5. Seller creates a new product linked to created category and seller.
 * 6. Retrieve product details with product ID.
 * 7. Validate properties match created data.
 * 8. Attempt to retrieve product with invalid product ID and expect error.
 */
export async function test_api_product_detail_retrieval(
  connection: api.IConnection,
) {
  // Step 1: Seller joins
  const sellerCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(32),
    company_name: RandomGenerator.name(2),
    contact_name: RandomGenerator.name(2),
    phone_number: RandomGenerator.mobile(),
    status: "active",
  } satisfies IShoppingMallSeller.ICreate;
  const sellerAuthorized = await api.functional.auth.seller.join(connection, {
    body: sellerCreateBody,
  });
  typia.assert(sellerAuthorized);

  // Step 2: Admin joins
  const adminCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(32),
    full_name: RandomGenerator.name(2),
    phone_number: RandomGenerator.mobile(),
    status: "active",
  } satisfies IShoppingMallAdmin.ICreate;
  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: adminCreateBody,
  });
  typia.assert(adminAuthorized);

  // Step 3: Admin logs in
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminCreateBody.email,
      password: adminCreateBody.password_hash,
      type: "admin",
      remember_me: true,
    } satisfies IShoppingMallAdmin.ILogin,
  });

  // Step 4: Admin creates a product category
  const categoryCreateBody = {
    code: `CAT-${RandomGenerator.alphaNumeric(5)}`,
    name: RandomGenerator.name(2),
    display_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1>
    >() satisfies number as number,
  } satisfies IShoppingMallCategory.ICreate;
  const category =
    await api.functional.shoppingMall.admin.shoppingMall.categories.create(
      connection,
      { body: categoryCreateBody },
    );
  typia.assert(category);

  // Step 5: Admin creates a seller entity
  const sellerCreateBodyAdmin = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(32),
    company_name: RandomGenerator.name(2),
    contact_name: RandomGenerator.name(2),
    phone_number: RandomGenerator.mobile(),
    status: "active",
  } satisfies IShoppingMallSeller.ICreate;
  const sellerAdminCreated =
    await api.functional.shoppingMall.admin.sellers.create(connection, {
      body: sellerCreateBodyAdmin,
    });
  typia.assert(sellerAdminCreated);

  // Step 6: Seller logs in (switch role)
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerCreateBody.email,
      password: sellerCreateBody.password_hash,
    } satisfies IShoppingMallSeller.ILogin,
  });

  // Step 7: Seller creates a product linked to category and seller
  const productCreateBody = {
    shopping_mall_category_id: category.id,
    shopping_mall_seller_id: sellerAuthorized.id,
    code: `PROD-${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.name(3),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "Active",
  } satisfies IShoppingMallProduct.ICreate;
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    { body: productCreateBody },
  );
  typia.assert(product);

  // Step 8: Retrieve product details
  const retrievedProduct = await api.functional.shoppingMall.products.at(
    connection,
    { productId: product.id },
  );
  typia.assert(retrievedProduct);
  TestValidator.equals("product id matches", retrievedProduct.id, product.id);
  TestValidator.equals(
    "category id matches",
    retrievedProduct.shopping_mall_category_id,
    category.id,
  );
  TestValidator.equals(
    "seller id matches",
    retrievedProduct.shopping_mall_seller_id,
    sellerAuthorized.id,
  );
  TestValidator.equals(
    "product code matches",
    retrievedProduct.code,
    productCreateBody.code,
  );
  TestValidator.equals(
    "product name matches",
    retrievedProduct.name,
    productCreateBody.name,
  );
  TestValidator.equals(
    "product status matches",
    retrievedProduct.status,
    productCreateBody.status,
  );

  // Step 9: Try to retrieve non-existent product, expecting error
  await TestValidator.error(
    "non-existent product retrieval should error",
    async () => {
      await api.functional.shoppingMall.products.at(connection, {
        productId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
}
