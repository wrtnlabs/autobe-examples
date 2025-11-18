import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerAuthLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthLogin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";

/**
 * Validate that an admin can create a product–category link for an existing
 * product.
 *
 * Business context: Admins manage the global catalog taxonomy and can
 * explicitly assign existing products into categories using the junction table
 * shopping_mall_product_categories. This test ensures that, given a real
 * product created by a seller and a real category created by an admin, the
 * admin can successfully create a primary product–category association via POST
 * /shoppingMall/admin/products/{productId}/categories.
 *
 * End-to-end steps:
 *
 * 1. Register an admin via /auth/admin/join (admin join).
 * 2. Register a seller via /auth/seller/join (seller join).
 * 3. As the seller, create a product via /shoppingMall/seller/products.
 * 4. Switch back to admin using /auth/admin/login to ensure admin auth context.
 * 5. As admin, create a category via /shoppingMall/admin/categories.
 * 6. As admin, create a product–category link via
 *    /shoppingMall/admin/products/{productId}/categories for the product in
 *    step 3 and the category in step 5 with is_primary=true.
 * 7. Validate that the returned IShoppingMallProductCategory:
 *
 *    - Has a non-empty UUID id
 *    - Has shopping_mall_product_id equal to the product id
 *    - Has shopping_mall_category_id equal to the category id
 *    - Has is_primary === true
 *    - Has non-null created_at and updated_at
 *    - Has deleted_at === null
 */
export async function test_api_admin_product_category_link_creation_with_existing_product_and_category(
  connection: api.IConnection,
) {
  // 1. Register an admin and obtain initial admin token via join
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdminJoin.ICreate,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminJoin);

  // 2. Register a seller and obtain seller token via join
  const sellerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const sellerPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const sellerJoin = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSellerAuthJoin.IRequest,
  });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerJoin);

  // 3. As the seller (connection now holds seller token), create a product
  const productCreateBody = {
    code: RandomGenerator.alphaNumeric(12),
    title: RandomGenerator.paragraph({ sentences: 2 }),
    summary: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: RandomGenerator.paragraph({ sentences: 1 }),
    model_name: RandomGenerator.paragraph({ sentences: 1 }),
    status: "active",
    primary_image_uri: typia.random<string & tags.Format<"uri">>(),
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert<IShoppingMallProduct>(product);

  // 4. Switch back to admin context using /auth/admin/login
  const adminLogin = await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdminLogin.ICreate,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminLogin);

  // 5. As admin, create a category
  const categoryCreateBody = {
    parent_id: null,
    slug: RandomGenerator.alphaNumeric(10),
    name_en: RandomGenerator.paragraph({ sentences: 1 }),
    description_en: RandomGenerator.paragraph({ sentences: 2 }),
    status: "active",
    sort_order: typia.random<number & tags.Type<"int32">>(),
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryCreateBody,
    });
  typia.assert<IShoppingMallCategory>(category);

  // 6. As admin, create a product–category link for the created product and category
  const linkCreateBody = {
    shopping_mall_category_id: category.id,
    is_primary: true,
  } satisfies IShoppingMallProductCategory.ICreate;

  const link: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: product.id,
        body: linkCreateBody,
      },
    );
  typia.assert<IShoppingMallProductCategory>(link);

  // 7. Assertions on the created link
  TestValidator.equals(
    "product-category link product id matches source product",
    link.shopping_mall_product_id,
    product.id,
  );

  TestValidator.equals(
    "product-category link category id matches source category",
    link.shopping_mall_category_id,
    category.id,
  );

  TestValidator.equals(
    "product-category link is marked as primary",
    link.is_primary,
    true,
  );

  TestValidator.predicate(
    "product-category link has a non-empty id",
    typeof link.id === "string" && link.id.length > 0,
  );

  TestValidator.predicate(
    "product-category link created_at is a non-empty string",
    typeof link.created_at === "string" && link.created_at.length > 0,
  );

  TestValidator.predicate(
    "product-category link updated_at is a non-empty string",
    typeof link.updated_at === "string" && link.updated_at.length > 0,
  );

  TestValidator.equals(
    "product-category link deleted_at is null",
    link.deleted_at ?? null,
    null,
  );
}
