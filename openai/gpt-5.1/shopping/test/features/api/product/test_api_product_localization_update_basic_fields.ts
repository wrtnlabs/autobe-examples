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
 * Validate updating basic fields of a product localization while preserving
 * locale and product linkage.
 *
 * Business goal: Ensure that an authenticated seller can update the localized
 * title, summary, and description of an existing product localization using
 * IShoppingMallProductLocalization.IUpdate, without changing its locale or
 * breaking the association to the parent product. The test also verifies
 * partial-update semantics and timestamp behavior at a high level.
 *
 * High-level workflow:
 *
 * 1. Register a seller via POST /auth/seller/join and keep the seller
 *    email/password for later logins.
 * 2. Register an admin via POST /auth/admin/join and keep admin credentials.
 * 3. As the seller (already authenticated from join), create a product via POST
 *    /shoppingMall/seller/products with a default_locale like "en-US".
 * 4. As the admin, create a category via POST /shoppingMall/admin/categories.
 * 5. As the admin, link the product and category via POST
 *    /shoppingMall/admin/products/{productId}/categories.
 * 6. As the seller, create a localization for the product via POST
 *    /shoppingMall/seller/products/{productId}/localizations with
 *    locale="en-US" and some initial title/summary/description.
 * 7. As the same seller, call PUT
 *    /shoppingMall/seller/products/{productId}/localizations/{productLocalizationId}
 *    with body of type IShoppingMallProductLocalization.IUpdate, providing only
 *    new values for title, summary, and description, and omitting locale so it
 *    remains unchanged.
 * 8. Assert that the response body is a valid IShoppingMallProductLocalization,
 *    that locale and product_id match the original localization, and that
 *    title/summary/description reflect the updated values. Optionally verify
 *    created_at is unchanged while updated_at has advanced and deleted_at
 *    remains null.
 *
 * Error paths like unauthorized access or cross-seller updates are covered in
 * other tests, so this scenario focuses on the happy-path update behavior and
 * field-level invariants.
 */
export async function test_api_product_localization_update_basic_fields(
  connection: api.IConnection,
) {
  // 1. Seller join (creates seller and authenticates as seller)
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12) as string &
      tags.Format<"password">,
    ip: null,
    href: "https://seller.portal.example.com/join",
    referrer: "https://seller.portal.example.com/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  const sellerEmail = sellerAuthorized.email;
  const sellerPassword = sellerJoinBody.password;

  // 2. Admin join (creates admin and authenticates as admin)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16) as string &
      tags.Format<"password">,
    ip: null,
    href: "https://admin.portal.example.com/join",
    referrer: "https://admin.portal.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  const adminEmail = adminAuthorized.email;
  const adminPassword = adminJoinBody.password;

  // 3. As seller, create a product with default_locale "en-US"
  // (We are currently authenticated as admin from join, so switch to seller.)
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      ip: null,
      href: "https://seller.portal.example.com/login",
      referrer: "https://seller.portal.example.com/landing",
    } satisfies IShoppingMallSellerAuthLogin.IRequest,
  });

  const productCreateBody = {
    code: RandomGenerator.alphaNumeric(10),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: RandomGenerator.name(1),
    model_name: RandomGenerator.alphaNumeric(6),
    status: "active",
    primary_image_uri:
      "https://cdn.example.com/products/" + RandomGenerator.alphaNumeric(8),
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  // 4. As admin, create a category
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      ip: null,
      href: "https://admin.portal.example.com/login",
      referrer: "https://admin.portal.example.com/landing",
    } satisfies IShoppingMallAdminLogin.ICreate,
  });

  const categoryCreateBody = {
    parent_id: null,
    slug: RandomGenerator.alphaNumeric(12),
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    description_en: RandomGenerator.paragraph({ sentences: 5 }),
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryCreateBody,
    });
  typia.assert(category);

  // 5. As admin, link the product to the category
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

  // 6. Switch back to seller, create initial localization for product
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      ip: null,
      href: "https://seller.portal.example.com/login",
      referrer: "https://seller.portal.example.com/landing",
    } satisfies IShoppingMallSellerAuthLogin.IRequest,
  });

  const initialLocale = "en-US";
  const initialTitle = "Initial localized title";
  const initialSummary = "Initial localized summary";
  const initialDescription = RandomGenerator.content({ paragraphs: 1 });

  const localizationCreateBody = {
    locale: initialLocale,
    title: initialTitle,
    summary: initialSummary,
    description: initialDescription,
  } satisfies IShoppingMallProductLocalization.ICreate;

  const createdLocalization: IShoppingMallProductLocalization =
    await api.functional.shoppingMall.seller.products.localizations.create(
      connection,
      {
        productId: product.id,
        body: localizationCreateBody,
      },
    );
  typia.assert(createdLocalization);

  // Capture original invariants for later assertions
  const originalId = createdLocalization.id;
  const originalProductId = createdLocalization.product_id;
  const originalLocale = createdLocalization.locale;
  const originalCreatedAt = createdLocalization.created_at;
  const originalUpdatedAt = createdLocalization.updated_at;
  const originalDeletedAt = createdLocalization.deleted_at ?? null;

  // Sanity checks on creation
  TestValidator.equals(
    "created localization product_id matches parent product",
    createdLocalization.product_id,
    product.id,
  );
  TestValidator.equals(
    "created localization locale matches requested locale",
    createdLocalization.locale,
    initialLocale,
  );

  // 7. Perform update: change only title, summary, description, omit locale
  const updatedTitle = "Updated localized title";
  const updatedSummary = "Updated localized summary";
  const updatedDescription = RandomGenerator.content({ paragraphs: 2 });

  const localizationUpdateBody = {
    title: updatedTitle,
    summary: updatedSummary,
    description: updatedDescription,
  } satisfies IShoppingMallProductLocalization.IUpdate;

  const updatedLocalization: IShoppingMallProductLocalization =
    await api.functional.shoppingMall.seller.products.localizations.update(
      connection,
      {
        productId: product.id,
        productLocalizationId: createdLocalization.id,
        body: localizationUpdateBody,
      },
    );
  typia.assert(updatedLocalization);

  // 8. Assertions: updated fields changed, locale/product_id preserved
  TestValidator.equals(
    "updated localization id should remain the same",
    updatedLocalization.id,
    originalId,
  );
  TestValidator.equals(
    "updated localization product_id should remain the same",
    updatedLocalization.product_id,
    originalProductId,
  );
  TestValidator.equals(
    "updated localization locale should remain the same",
    updatedLocalization.locale,
    originalLocale,
  );

  TestValidator.equals(
    "title should be updated",
    updatedLocalization.title,
    updatedTitle,
  );
  TestValidator.equals(
    "summary should be updated",
    updatedLocalization.summary,
    updatedSummary,
  );
  TestValidator.equals(
    "description should be updated",
    updatedLocalization.description,
    updatedDescription,
  );

  // Optional timestamp and deletion invariants
  TestValidator.equals(
    "created_at should remain unchanged after update",
    updatedLocalization.created_at,
    originalCreatedAt,
  );

  TestValidator.predicate(
    "updated_at should be equal or after original updated_at",
    new Date(updatedLocalization.updated_at).getTime() >=
      new Date(originalUpdatedAt).getTime(),
  );

  TestValidator.equals(
    "deleted_at should remain null after update",
    updatedLocalization.deleted_at ?? null,
    originalDeletedAt,
  );
}
