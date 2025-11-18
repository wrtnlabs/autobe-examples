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
 * Validate that creating a duplicate product localization for the same locale
 * is rejected.
 *
 * Business goal: Ensure that the seller product localization API enforces the
 * uniqueness constraint on (product_id, locale), so that a product cannot have
 * more than one localization for the same locale. The first creation for a
 * given locale should succeed, while a second attempt with the same locale for
 * the same product must fail.
 *
 * Scenario steps:
 *
 * 1. Register a seller account and obtain seller authentication.
 * 2. Register an admin account and obtain admin authentication.
 * 3. As admin, create a category to be used for the product.
 * 4. Switch to seller and create a base product with default_locale="en-US".
 * 5. Switch to admin and link the product to the created category as primary.
 * 6. Switch back to seller and create a first localization for locale="en-US".
 * 7. Attempt to create a second localization with the same locale for the same
 *    product and assert that the API call fails.
 */
export async function test_api_product_localization_create_reject_duplicate_locale(
  connection: api.IConnection,
) {
  // 1. Register a seller and implicitly authenticate as that seller
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

  const sellerAuth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuth);

  // 2. Register an admin and implicitly authenticate as that admin
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

  const adminAuth: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuth);

  // 3. As admin, create a category for the product taxonomy
  const categoryCreateBody = {
    parent_id: null,
    slug: `cat-${RandomGenerator.alphaNumeric(8)}`,
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    description_en: RandomGenerator.paragraph({ sentences: 4 }),
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryCreateBody,
    });
  typia.assert(category);

  // 4. Switch to seller and create a base product with default_locale="en-US"
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
  typia.assert(sellerLogin);

  const productCreateBody = {
    code: `P-${RandomGenerator.alphaNumeric(10)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: RandomGenerator.paragraph({ sentences: 1 }),
    model_name: RandomGenerator.paragraph({ sentences: 1 }),
    status: "active",
    primary_image_uri: "https://cdn.example.com/images/product.jpg" as string &
      tags.Format<"uri">,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  // 5. Switch to admin and link the product to the category as primary
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
  typia.assert(adminLogin);

  const productCategoryCreateBody = {
    shopping_mall_category_id: category.id,
    is_primary: true,
  } satisfies IShoppingMallProductCategory.ICreate;

  const productCategory: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: product.id,
        body: productCategoryCreateBody,
      },
    );
  typia.assert(productCategory);

  // 6. Switch back to seller for localization operations
  const sellerLoginAgainBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/dashboard",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerLoginAgain: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginAgainBody,
    });
  typia.assert(sellerLoginAgain);

  // 7. Create the first localization for locale = "en-US"
  const localizationCreateBody = {
    locale: "en-US",
    title: RandomGenerator.paragraph({ sentences: 2 }),
    summary: RandomGenerator.paragraph({ sentences: 4 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies IShoppingMallProductLocalization.ICreate;

  const firstLocalization: IShoppingMallProductLocalization =
    await api.functional.shoppingMall.seller.products.localizations.create(
      connection,
      {
        productId: product.id,
        body: localizationCreateBody,
      },
    );
  typia.assert(firstLocalization);

  // 8. Attempt to create a second localization with the same locale for the same product
  const duplicateLocalizationCreateBody = {
    locale: "en-US",
    title: RandomGenerator.paragraph({ sentences: 2 }),
    summary: RandomGenerator.paragraph({ sentences: 4 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies IShoppingMallProductLocalization.ICreate;

  await TestValidator.error(
    "creating duplicate localization for same locale must fail",
    async () => {
      await api.functional.shoppingMall.seller.products.localizations.create(
        connection,
        {
          productId: product.id,
          body: duplicateLocalizationCreateBody,
        },
      );
    },
  );

  // 9. Ensure the first localization object is still valid (in-memory validation)
  typia.assert<IShoppingMallProductLocalization>(firstLocalization);
}
