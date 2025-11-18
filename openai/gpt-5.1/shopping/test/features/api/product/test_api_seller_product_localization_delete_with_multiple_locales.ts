import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductLocalization } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductLocalization";
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

export async function test_api_seller_product_localization_delete_with_multiple_locales(
  connection: api.IConnection,
) {
  // 1. Seller registration (join) and authentication context establishment
  const sellerJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@seller.example.com`,
    password: RandomGenerator.alphabets(12),
    ip: null,
    href: "https://seller.example.com/join",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  const sellerEmail = sellerAuthorized.email;
  const sellerPassword = sellerJoinBody.password;

  // 2. Seller login to ensure login flow also works and to refresh token context
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/join-complete",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerLoginAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoginAuthorized);

  // 3. Seller creates a product that will have multiple localizations
  const productCreateBody = {
    code: RandomGenerator.alphaNumeric(10),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: RandomGenerator.name(1),
    model_name: RandomGenerator.name(1),
    status: "active",
    primary_image_uri:
      "https://cdn.example.com/images/" +
      RandomGenerator.alphaNumeric(16) +
      ".jpg",
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  // 4. Admin registration and login to manage catalog associations and indexing
  const adminJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@admin.example.com`,
    password: RandomGenerator.alphabets(12) as string & tags.Format<"password">,
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  const adminEmail = adminAuthorized.email;
  const adminPassword = adminJoinBody.password;

  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/join-complete",
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLoginAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginAuthorized);

  // 5. Admin creates a category and associates it with the product
  const categoryCreateBody = {
    parent_id: null,
    slug: RandomGenerator.alphaNumeric(12),
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

  // 6. Switch back to seller (login again) to create localizations
  const sellerRelogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerRelogin);

  // 7. Seller creates two localizations: en-US and ko-KR
  const enLocalizationCreateBody = {
    locale: "en-US",
    title: "English Title " + RandomGenerator.paragraph({ sentences: 1 }),
    summary: "English Summary " + RandomGenerator.paragraph({ sentences: 2 }),
    description:
      "English Description\n" +
      RandomGenerator.content({
        paragraphs: 1,
        sentenceMin: 5,
        sentenceMax: 8,
      }),
  } satisfies IShoppingMallProductLocalization.ICreate;

  const enLocalization: IShoppingMallProductLocalization =
    await api.functional.shoppingMall.seller.products.localizations.create(
      connection,
      {
        productId: product.id,
        body: enLocalizationCreateBody,
      },
    );
  typia.assert(enLocalization);

  const koLocalizationCreateBody = {
    locale: "ko-KR",
    title: "Korean Title " + RandomGenerator.paragraph({ sentences: 1 }),
    summary: "Korean Summary " + RandomGenerator.paragraph({ sentences: 2 }),
    description:
      "Korean Description\n" +
      RandomGenerator.content({
        paragraphs: 1,
        sentenceMin: 5,
        sentenceMax: 8,
      }),
  } satisfies IShoppingMallProductLocalization.ICreate;

  const koLocalization: IShoppingMallProductLocalization =
    await api.functional.shoppingMall.seller.products.localizations.create(
      connection,
      {
        productId: product.id,
        body: koLocalizationCreateBody,
      },
    );
  typia.assert(koLocalization);

  // Sanity check: both localizations must belong to the same product
  TestValidator.equals(
    "localizations belong to same product",
    enLocalization.product_id,
    product.id,
  );
  TestValidator.equals(
    "localizations belong to same product (ko)",
    koLocalization.product_id,
    product.id,
  );

  // 8. Seller deletes only the en-US localization
  await api.functional.shoppingMall.seller.products.localizations.erase(
    connection,
    {
      productId: product.id,
      productLocalizationId: enLocalization.id,
    },
  );

  // 9. Switch to admin to verify remaining localizations using the index endpoint
  const adminRelogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminRelogin);

  // 10. Admin lists all localizations for this product without filtering,
  // expecting only the ko-KR localization to remain
  const indexRequestAll = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    locales: undefined,
    search: undefined,
    orderBy: "created_at" as const,
    orderDirection: "asc" as const,
  } satisfies IShoppingMallProductLocalization.IRequest;

  const allLocalizationsPage: IPageIShoppingMallProductLocalization.ISummary =
    await api.functional.shoppingMall.admin.products.localizations.index(
      connection,
      {
        productId: product.id,
        body: indexRequestAll,
      },
    );
  typia.assert(allLocalizationsPage);

  const allData = allLocalizationsPage.data;

  // There must be at least one localization (ko-KR)
  TestValidator.predicate(
    "at least one localization remains after delete",
    allData.length >= 1,
  );

  // Ensure ko-KR localization is still present
  const koStillExists = allData.some((loc) => loc.id === koLocalization.id);
  TestValidator.predicate("ko-KR localization should remain", koStillExists);

  // Ensure en-US localization is no longer present in the listing
  const enStillExists = allData.some((loc) => loc.id === enLocalization.id);
  TestValidator.predicate(
    "en-US localization should be deleted from listing",
    enStillExists === false,
  );

  // Additionally, query by locales filter for ko-KR only and verify it is returned
  const indexRequestKoOnly = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    locales: ["ko-KR"],
    search: undefined,
    orderBy: "created_at" as const,
    orderDirection: "asc" as const,
  } satisfies IShoppingMallProductLocalization.IRequest;

  const koPage: IPageIShoppingMallProductLocalization.ISummary =
    await api.functional.shoppingMall.admin.products.localizations.index(
      connection,
      {
        productId: product.id,
        body: indexRequestKoOnly,
      },
    );
  typia.assert(koPage);

  const koIds = koPage.data.map((l) => l.id);
  TestValidator.predicate(
    "filtered ko-KR localizations should include existing ko-KR",
    koIds.includes(koLocalization.id),
  );

  // Additionally, verify that there is no remaining localization with locale en-US
  const indexRequestEnOnly = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    locales: ["en-US"],
    search: undefined,
    orderBy: "created_at" as const,
    orderDirection: "asc" as const,
  } satisfies IShoppingMallProductLocalization.IRequest;

  const enPage: IPageIShoppingMallProductLocalization.ISummary =
    await api.functional.shoppingMall.admin.products.localizations.index(
      connection,
      {
        productId: product.id,
        body: indexRequestEnOnly,
      },
    );
  typia.assert(enPage);

  TestValidator.predicate(
    "no en-US localizations should remain after delete",
    enPage.data.every((loc) => loc.locale !== "en-US"),
  );

  // 11. Validate uniqueness pair (productId, locale) remains reusable:
  // re-create the en-US localization after deletion should succeed.
  const sellerReloginForRecreate: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerReloginForRecreate);

  const enLocalizationRecreateBody = {
    locale: "en-US",
    title:
      "English Title Recreated " + RandomGenerator.paragraph({ sentences: 1 }),
    summary:
      "English Summary Recreated " +
      RandomGenerator.paragraph({ sentences: 2 }),
    description:
      "English Description Recreated\n" +
      RandomGenerator.content({
        paragraphs: 1,
        sentenceMin: 5,
        sentenceMax: 8,
      }),
  } satisfies IShoppingMallProductLocalization.ICreate;

  const enLocalizationRecreated: IShoppingMallProductLocalization =
    await api.functional.shoppingMall.seller.products.localizations.create(
      connection,
      {
        productId: product.id,
        body: enLocalizationRecreateBody,
      },
    );
  typia.assert(enLocalizationRecreated);

  TestValidator.equals(
    "recreated en-US localization belongs to same product",
    enLocalizationRecreated.product_id,
    product.id,
  );

  // Final admin check to ensure there are now at least two localizations again
  const finalAdminRelogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(finalAdminRelogin);

  const finalIndexRequest = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    locales: undefined,
    search: undefined,
    orderBy: "created_at" as const,
    orderDirection: "asc" as const,
  } satisfies IShoppingMallProductLocalization.IRequest;

  const finalPage: IPageIShoppingMallProductLocalization.ISummary =
    await api.functional.shoppingMall.admin.products.localizations.index(
      connection,
      {
        productId: product.id,
        body: finalIndexRequest,
      },
    );
  typia.assert(finalPage);

  const localesById: Record<string, string> = finalPage.data.reduce(
    (acc, cur) => {
      acc[cur.id] = cur.locale;
      return acc;
    },
    {} as Record<string, string>,
  );

  TestValidator.equals(
    "ko-KR localization still present in final listing",
    localesById[koLocalization.id],
    "ko-KR",
  );
  TestValidator.equals(
    "en-US localization recreated present in final listing",
    localesById[enLocalizationRecreated.id],
    "en-US",
  );
}
