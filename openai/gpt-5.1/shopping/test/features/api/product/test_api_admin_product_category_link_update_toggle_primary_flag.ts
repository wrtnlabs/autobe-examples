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
 * Validate that an admin can toggle the is_primary flag on a product–category
 * link while preserving product/category foreign keys and updating timestamps.
 *
 * Business flow:
 *
 * 1. A seller registers and creates a product.
 * 2. An admin registers and creates a category.
 * 3. The admin links the product to the category with is_primary = true.
 * 4. The admin updates that link, setting is_primary = false.
 * 5. The test verifies that only is_primary and updated_at changed, while id,
 *    shopping_mall_product_id, shopping_mall_category_id, and created_at remain
 *    consistent and that updated_at increased.
 */
export async function test_api_admin_product_category_link_update_toggle_primary_flag(
  connection: api.IConnection,
) {
  // 1. Seller joins (self-registration) and becomes authenticated
  const sellerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const sellerPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const sellerJoinBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: "https://seller.example.com/join",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAuthorized);

  // Optional explicit seller login to exercise login flow
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/join",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerLoggedIn: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerLoggedIn);

  // 2. Seller creates a product
  const productCreateBody = {
    code: RandomGenerator.alphaNumeric(12),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
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

  // 3. Admin joins and becomes authenticated
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorizedFromJoin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorizedFromJoin);

  // Explicit admin login to ensure Authorization header is definitely admin
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/join",
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminAuthorizedFromLogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorizedFromLogin);

  // 4. Admin creates a category
  const categoryCreateBody = {
    parent_id: null,
    slug: RandomGenerator.alphaNumeric(10),
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    description_en: RandomGenerator.paragraph({ sentences: 4 }),
    status: "active",
    sort_order: 1,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryCreateBody,
    });
  typia.assert<IShoppingMallCategory>(category);

  // 5. Admin creates initial product–category link with is_primary = true
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

  // Validate invariants on creation
  TestValidator.equals(
    "created link product id matches product.id",
    link.shopping_mall_product_id,
    product.id,
  );
  TestValidator.equals(
    "created link category id matches category.id",
    link.shopping_mall_category_id,
    category.id,
  );
  TestValidator.predicate(
    "created link is_primary must be true",
    link.is_primary === true,
  );

  const originalCreatedAt: string & tags.Format<"date-time"> = link.created_at;
  const originalUpdatedAt: string & tags.Format<"date-time"> = link.updated_at;

  // 6. Admin updates link to toggle is_primary = false
  const linkUpdateBody = {
    is_primary: false,
  } satisfies IShoppingMallProductCategory.IUpdate;

  const updatedLink: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.products.categories.update(
      connection,
      {
        productId: product.id,
        productCategoryLinkId: link.id,
        body: linkUpdateBody,
      },
    );
  typia.assert<IShoppingMallProductCategory>(updatedLink);

  // 7. Post-conditions and business rule validations
  TestValidator.equals(
    "updated link id remains the same",
    updatedLink.id,
    link.id,
  );
  TestValidator.equals(
    "updated link product id remains the same",
    updatedLink.shopping_mall_product_id,
    product.id,
  );
  TestValidator.equals(
    "updated link category id remains the same",
    updatedLink.shopping_mall_category_id,
    category.id,
  );
  TestValidator.predicate(
    "updated link is_primary must be false",
    updatedLink.is_primary === false,
  );
  TestValidator.equals(
    "created_at is immutable across update",
    updatedLink.created_at,
    originalCreatedAt,
  );

  const originalUpdatedMillis: number = new Date(originalUpdatedAt).getTime();
  const updatedUpdatedMillis: number = new Date(
    updatedLink.updated_at,
  ).getTime();

  TestValidator.predicate(
    "updated_at must advance after update",
    updatedUpdatedMillis > originalUpdatedMillis,
  );
}
