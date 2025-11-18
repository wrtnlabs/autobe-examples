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
 * Validate creation of a product localization for the product's default
 * language by an authenticated seller, including category linkage and
 * authorization boundaries.
 *
 * Business context:
 *
 * - Sellers onboard via /auth/seller/join and manage their own products via
 *   /shoppingMall/seller/products.
 * - Admins manage global catalog taxonomy and product-category links via
 *   /shoppingMall/admin/categories and
 *   /shoppingMall/admin/products/{productId}/categories.
 * - Sellers can create localized content for their products via
 *   /shoppingMall/seller/products/{productId}/localizations, including for the
 *   product's default_locale, which should still result in a distinct
 *   localization row.
 *
 * End-to-end steps:
 *
 * 1. Register a new seller and obtain an authorized seller context.
 * 2. Register a new admin and obtain an authorized admin context.
 * 3. As admin, create a base category in the global taxonomy.
 * 4. Switch back to the seller, then create a new product with default_locale set
 *    to a concrete value like "en-US".
 * 5. Switch to admin again and associate the product to the category with
 *    is_primary=true.
 * 6. Switch back to the seller and create a localization for the same product
 *    where locale === product.default_locale, with distinct title/summary/
 *    description.
 * 7. Assert that the localization response has the correct product_id, locale, and
 *    textual fields that exactly match the request body.
 * 8. Negative authorization: while authenticated as admin, attempt to call the
 *    seller localization creation endpoint for the same product and assert that
 *    it fails using TestValidator.error (without checking specific status
 *    codes).
 */
export async function test_api_product_localization_create_for_default_language(
  connection: api.IConnection,
) {
  // 1. Seller join (registration) to get an authenticated seller context
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
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

  const sellerJoinOutput: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerJoinOutput);

  // 2. Admin join to get an admin context
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
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

  const adminJoinOutput: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminJoinOutput);

  // 3. As admin, create a category
  const categorySlug = `cat-${RandomGenerator.alphaNumeric(8)}`;
  const categoryCreateBody = {
    parent_id: null,
    slug: categorySlug,
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

  // 4. Switch back to seller by logging in
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerLoginOutput: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoginOutput);

  // 5. Seller creates a product with default_locale "en-US"
  const defaultLocale = "en-US";
  const productCode = `SKU-${RandomGenerator.alphaNumeric(10)}`;
  const baseTitle = RandomGenerator.paragraph({ sentences: 3 });
  const baseSummary = RandomGenerator.paragraph({ sentences: 5 });
  const baseDescription = RandomGenerator.content({ paragraphs: 2 });

  const productCreateBody = {
    code: productCode,
    title: baseTitle,
    summary: baseSummary,
    description: baseDescription,
    brand: RandomGenerator.paragraph({ sentences: 1 }),
    model_name: RandomGenerator.paragraph({ sentences: 1 }),
    status: "active",
    primary_image_uri:
      "https://cdn.example.com/images/product-main.jpg" as string &
        tags.Format<"uri">,
    default_locale: defaultLocale,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  TestValidator.equals(
    "product default_locale should match request",
    product.default_locale,
    defaultLocale,
  );

  // 6. Switch to admin and link product to category with is_primary=true
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLoginOutput: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginOutput);

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

  TestValidator.equals(
    "created product category link is_primary should be true",
    productCategory.is_primary,
    true,
  );

  // 7. Switch back to seller and create localization for default locale
  const sellerLoginForLocalizationBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerLoginForLocalizationOutput: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginForLocalizationBody,
    });
  typia.assert(sellerLoginForLocalizationOutput);

  const localizationLocale = product.default_locale;
  const localizationTitle = `${baseTitle} (localized)`;
  const localizationSummary = `${baseSummary} (localized)`;
  const localizationDescription = `${baseDescription}

Localized variant.`;

  const localizationCreateBody = {
    locale: localizationLocale,
    title: localizationTitle,
    summary: localizationSummary,
    description: localizationDescription,
  } satisfies IShoppingMallProductLocalization.ICreate;

  const localization: IShoppingMallProductLocalization =
    await api.functional.shoppingMall.seller.products.localizations.create(
      connection,
      {
        productId: product.id,
        body: localizationCreateBody,
      },
    );
  typia.assert(localization);

  TestValidator.equals(
    "localization product_id matches product.id",
    localization.product_id,
    product.id,
  );
  TestValidator.equals(
    "localization locale matches request",
    localization.locale,
    localizationLocale,
  );
  TestValidator.equals(
    "localization title persists exactly",
    localization.title,
    localizationTitle,
  );
  TestValidator.equals(
    "localization summary persists exactly",
    localization.summary,
    localizationSummary,
  );
  TestValidator.equals(
    "localization description persists exactly",
    localization.description,
    localizationDescription,
  );

  // 8. Negative authorization scenario: attempt as admin to call seller endpoint
  const adminLoginForNegativeBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLoginForNegativeOutput: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginForNegativeBody,
    });
  typia.assert(adminLoginForNegativeOutput);

  await TestValidator.error(
    "admin cannot use seller localization endpoint",
    async () => {
      await api.functional.shoppingMall.seller.products.localizations.create(
        connection,
        {
          productId: product.id,
          body: localizationCreateBody,
        },
      );
    },
  );
}
