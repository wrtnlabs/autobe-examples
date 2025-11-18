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
import type { IShoppingMallProductLocalization } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductLocalization";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerAuthLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthLogin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";

/**
 * Validate creating an additional product localization for a different locale.
 *
 * Business goal: Ensure a seller can create multiple localizations for the same
 * product as long as each (product, locale) pair is unique. This test covers
 * creating a base product, linking it to a category, creating an initial
 * localization in the default locale, and then creating a second localization
 * for another locale.
 *
 * Steps:
 *
 * 1. Register a seller via /auth/seller/join.
 * 2. Register an admin via /auth/admin/join.
 * 3. As admin, create a category via /shoppingMall/admin/categories.
 * 4. Switch to seller auth via /auth/seller/login.
 * 5. As seller, create a base product with default_locale "en-US" via
 *    /shoppingMall/seller/products.
 * 6. Switch to admin auth via /auth/admin/login.
 * 7. As admin, link the product to the created category via
 *    /shoppingMall/admin/products/{productId}/categories.
 * 8. Switch back to seller via /auth/seller/login.
 * 9. As seller, create initial localization for locale "en-US" via
 *    /shoppingMall/seller/products/{productId}/localizations.
 * 10. As seller, create a second localization for the same product with locale
 *     "ko-KR" and different localized texts.
 * 11. Assert that:
 *
 *     - Both localization responses are valid IShoppingMallProductLocalization.
 *     - Both have the same product_id.
 *     - Locales are "en-US" and "ko-KR" respectively.
 *     - The two localization ids are different.
 */
export async function test_api_product_localization_create_for_additional_locale(
  connection: api.IConnection,
) {
  // 1. Register seller (join)
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

  // 2. Register admin (join)
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

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 3. As admin (current auth is admin after join), create category
  const categoryCreateBody = {
    parent_id: null,
    slug: `cat-${RandomGenerator.alphaNumeric(8)}`,
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    description_en: RandomGenerator.paragraph({ sentences: 5 }),
    status: "active",
    sort_order: 1,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryCreateBody,
    });
  typia.assert<IShoppingMallCategory>(category);

  // 4. Switch to seller auth via login to ensure seller context is active
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerLogin);

  // 5. As seller, create product with default_locale "en-US"
  const productCreateBody = {
    code: `PRD-${RandomGenerator.alphaNumeric(8)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 4 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: RandomGenerator.paragraph({ sentences: 1 }),
    model_name: RandomGenerator.paragraph({ sentences: 1 }),
    status: "active",
    primary_image_uri:
      "https://cdn.example.com/images/" + RandomGenerator.alphaNumeric(16),
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert<IShoppingMallProduct>(product);

  TestValidator.equals(
    "product default locale should be en-US",
    product.default_locale,
    "en-US",
  );

  // 6. Switch to admin auth for category link
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminLogin);

  // 7. Link product to category
  const productCategoryBody = {
    shopping_mall_category_id: category.id,
    is_primary: true,
  } satisfies IShoppingMallProductCategory.ICreate;

  const productCategory: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: product.id,
        body: productCategoryBody,
      },
    );
  typia.assert<IShoppingMallProductCategory>(productCategory);

  TestValidator.equals(
    "linked category id matches created category id",
    productCategory.shopping_mall_category_id,
    category.id,
  );

  // 8. Switch back to seller auth
  const sellerLoginAgain: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerLoginAgain);

  // 9. Create initial localization for locale "en-US"
  const enLocalizationBody = {
    locale: "en-US",
    title: RandomGenerator.paragraph({ sentences: 2 }),
    summary: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
  } satisfies IShoppingMallProductLocalization.ICreate;

  const enLocalization: IShoppingMallProductLocalization =
    await api.functional.shoppingMall.seller.products.localizations.create(
      connection,
      {
        productId: product.id,
        body: enLocalizationBody,
      },
    );
  typia.assert<IShoppingMallProductLocalization>(enLocalization);

  TestValidator.equals(
    "en localization product_id matches product.id",
    enLocalization.product_id,
    product.id,
  );
  TestValidator.equals(
    "en localization locale is en-US",
    enLocalization.locale,
    "en-US",
  );

  // 10. Create second localization for locale "ko-KR"
  const koLocalizationBody = {
    locale: "ko-KR",
    title: RandomGenerator.paragraph({ sentences: 2 }),
    summary: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
  } satisfies IShoppingMallProductLocalization.ICreate;

  const koLocalization: IShoppingMallProductLocalization =
    await api.functional.shoppingMall.seller.products.localizations.create(
      connection,
      {
        productId: product.id,
        body: koLocalizationBody,
      },
    );
  typia.assert<IShoppingMallProductLocalization>(koLocalization);

  // 11. Business assertions: same product, different locale, different ids
  TestValidator.equals(
    "ko localization product_id matches product.id",
    koLocalization.product_id,
    product.id,
  );
  TestValidator.equals(
    "ko localization locale is ko-KR",
    koLocalization.locale,
    "ko-KR",
  );
  TestValidator.notEquals(
    "localization ids should differ between en-US and ko-KR",
    enLocalization.id,
    koLocalization.id,
  );
}
