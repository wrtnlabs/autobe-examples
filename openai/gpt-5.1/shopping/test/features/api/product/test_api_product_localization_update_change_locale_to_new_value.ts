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
 * Validate updating a product localization’s locale to a new, unused locale for
 * the same product.
 *
 * Business flow:
 *
 * - A seller exists and owns a product.
 * - The product has a default locale "en-US" and an existing localization also in
 *   "en-US".
 * - The seller wants to change that localization’s locale to a different locale
 *   (e.g. "fr-FR") without creating a new record, respecting the uniqueness
 *   rule on (product_id, locale).
 *
 * Steps implemented in this test:
 *
 * 1. Create a seller via /auth/seller/join (connection becomes authenticated as
 *    seller).
 * 2. Create an admin via /auth/admin/join (connection becomes authenticated as
 *    admin).
 * 3. As admin, create a category via /shoppingMall/admin/categories.
 * 4. Switch back to seller via /auth/seller/login.
 * 5. As seller, create a product via /shoppingMall/seller/products with
 *    default_locale = "en-US".
 * 6. Switch to admin via /auth/admin/login and link the product to the category
 *    via /shoppingMall/admin/products/{productId}/categories.
 * 7. Switch to seller via /auth/seller/login and create a localization for that
 *    product in locale = "en-US".
 * 8. Call PUT
 *    /shoppingMall/seller/products/{productId}/localizations/{productLocalizationId}
 *    with body of type IShoppingMallProductLocalization.IUpdate, changing
 *    locale to "fr-FR" and updating localized fields.
 * 9. Assert that:
 *
 *    - The localization id is unchanged.
 *    - Product_id still matches the parent product.id.
 *    - Locale is now "fr-FR".
 *    - Updated fields (e.g., title/summary/description) reflect new values.
 *    - Fields omitted in the update body are preserved from the original
 *         localization.
 */
export async function test_api_product_localization_update_change_locale_to_new_value(
  connection: api.IConnection,
) {
  // 1. Seller join (creates seller and authenticates connection as seller)
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Passw0rd!" as string & tags.Format<"password">,
    ip: null,
    href: "https://seller.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://seller.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  // Preserve seller email/password for later logins
  const sellerEmail: string & tags.Format<"email"> = sellerAuthorized.email;
  const sellerPassword: string & tags.Format<"password"> =
    sellerJoinBody.password;

  // 2. Admin join (creates admin and authenticates as admin)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPassw0rd!" as string & tags.Format<"password">,
    ip: null,
    href: "https://admin.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/ref" as string & tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  const adminEmail: string & tags.Format<"email"> = adminAuthorized.email;
  const adminPassword: string & tags.Format<"password"> =
    adminJoinBody.password;

  // 3. As admin, create a category
  const categoryCreateBody = {
    parent_id: null,
    slug: `cat-${RandomGenerator.alphaNumeric(8)}`,
    name_en: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 3,
      wordMax: 8,
    }),
    description_en: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 3,
      wordMax: 10,
    }),
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryCreateBody,
    });
  typia.assert(category);

  // 4. Switch back to seller via login
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: "https://seller.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://seller.example.com" as string & tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLogin);

  // 5. As seller, create a product with default_locale = "en-US"
  const productCreateBody = {
    code: `P-${RandomGenerator.alphaNumeric(10)}`,
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 10 }),
    summary: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 3,
      wordMax: 10,
    }),
    description: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 8,
      sentenceMax: 15,
      wordMin: 3,
      wordMax: 10,
    }),
    brand: RandomGenerator.paragraph({ sentences: 1, wordMin: 3, wordMax: 10 }),
    model_name: RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 3,
      wordMax: 10,
    }),
    status: "active",
    primary_image_uri:
      "https://cdn.example.com/images/product-main.jpg" as string &
        tags.Format<"uri">,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  // 6. Switch to admin and link the product to the category
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com" as string & tags.Format<"uri">,
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);

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
  typia.assert(productCategory);

  // 7. Switch back to seller and create initial localization in "en-US"
  const sellerLoginAgainBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: "https://seller.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://seller.example.com" as string & tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerLoginAgain: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginAgainBody,
    });
  typia.assert(sellerLoginAgain);

  const initialLocalizationBody = {
    locale: "en-US",
    title: `${product.title} (EN)`,
    summary: `${product.summary} (EN)`,
    description: `${product.description}\nLocalized EN description.`,
  } satisfies IShoppingMallProductLocalization.ICreate;

  const initialLocalization: IShoppingMallProductLocalization =
    await api.functional.shoppingMall.seller.products.localizations.create(
      connection,
      {
        productId: product.id,
        body: initialLocalizationBody,
      },
    );
  typia.assert(initialLocalization);

  // 8. Update localization: change locale to "fr-FR" and update some content
  const newLocale = "fr-FR";
  const updatedTitle = `${product.title} (FR)`;
  const updatedSummary = RandomGenerator.paragraph({
    sentences: 4,
    wordMin: 3,
    wordMax: 10,
  });

  const updateBody = {
    locale: newLocale,
    title: updatedTitle,
    summary: updatedSummary,
    // Intentionally omit description to verify it is preserved
  } satisfies IShoppingMallProductLocalization.IUpdate;

  const updatedLocalization: IShoppingMallProductLocalization =
    await api.functional.shoppingMall.seller.products.localizations.update(
      connection,
      {
        productId: product.id,
        productLocalizationId: initialLocalization.id,
        body: updateBody,
      },
    );
  typia.assert(updatedLocalization);

  // 9. Assertions on updated localization
  TestValidator.equals(
    "localization id remains unchanged after update",
    updatedLocalization.id,
    initialLocalization.id,
  );

  TestValidator.equals(
    "product_id of localization still matches product.id",
    updatedLocalization.product_id,
    product.id,
  );

  TestValidator.equals(
    "locale has been updated to new value",
    updatedLocalization.locale,
    newLocale,
  );

  TestValidator.equals(
    "title updated to new localized title",
    updatedLocalization.title,
    updatedTitle,
  );

  TestValidator.equals(
    "summary updated to new localized summary",
    updatedLocalization.summary,
    updatedSummary,
  );

  TestValidator.equals(
    "description preserved when omitted in update body",
    updatedLocalization.description,
    initialLocalization.description,
  );
}
