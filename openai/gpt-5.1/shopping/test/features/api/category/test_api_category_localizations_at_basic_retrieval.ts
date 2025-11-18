import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCategoryLocalization } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategoryLocalization";

/**
 * Basic happy-path retrieval of a single category localization via public API.
 *
 * ## Business context
 *
 * The shoppingMall platform allows administrators to manage a global category
 * taxonomy and attach localized labels/SEO metadata to each category for
 * specific locales. Public storefront clients then consume these localizations
 * via a public GET endpoint to render localized navigation and category pages.
 *
 * This test validates the simplest successful flow:
 *
 * 1. An admin registers (join) to obtain an authenticated admin context.
 * 2. The admin creates a base category in the global taxonomy.
 * 3. The admin creates a localization for that category for a concrete locale
 *    (e.g., "en-US"), providing localized name/description/SEO fields.
 * 4. A public client retrieves that localization via GET
 *    /shoppingMall/categories/{categoryId}/localizations/{locale}.
 * 5. The retrieved localization matches exactly what was created, and its nested
 *    category summary refers back to the correct category.
 *
 * The primary contract being validated is that the (categoryId, locale) pair
 * uniquely identifies the localization row and that the public endpoint returns
 * a consistent IShoppingMallCategoryLocalization structure.
 */
export async function test_api_category_localizations_at_basic_retrieval(
  connection: api.IConnection,
) {
  // 1. Admin joins to obtain authorized context (token is managed by SDK).
  const adminJoinBody = typia.random<IShoppingMallAdminJoin.ICreate>();
  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Admin creates a base category in the taxonomy.
  const categoryCreateBody = typia.random<IShoppingMallCategory.ICreate>();
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryCreateBody,
    });
  typia.assert(category);

  // 3. Admin creates a localization for that category for a specific locale.
  const locale = "en-US";
  const localizedName = RandomGenerator.paragraph({ sentences: 2 });
  const localizedDescription = RandomGenerator.paragraph({ sentences: 3 });
  const localizedSeoTitle = RandomGenerator.paragraph({ sentences: 1 });
  const localizedSeoDescription = RandomGenerator.paragraph({ sentences: 4 });

  const localizationCreateBody = {
    locale,
    name: localizedName,
    description: localizedDescription,
    seo_title: localizedSeoTitle,
    seo_description: localizedSeoDescription,
  } satisfies IShoppingMallCategoryLocalization.ICreate;

  const createdLocalization: IShoppingMallCategoryLocalization =
    await api.functional.shoppingMall.admin.categories.localizations.create(
      connection,
      {
        categoryId: category.id,
        body: localizationCreateBody,
      },
    );
  typia.assert(createdLocalization);

  // 4. Public client retrieves the localization via GET endpoint.
  const retrievedLocalization: IShoppingMallCategoryLocalization =
    await api.functional.shoppingMall.categories.localizations.at(connection, {
      categoryId: category.id,
      locale,
    });
  typia.assert(retrievedLocalization);

  // 5. Validate that retrieved localization matches what was created.
  TestValidator.equals(
    "locale should match the requested locale",
    retrievedLocalization.locale,
    locale,
  );

  TestValidator.equals(
    "name should match the created localized name",
    retrievedLocalization.name,
    localizedName,
  );

  TestValidator.equals(
    "description should match the created localized description",
    retrievedLocalization.description ?? null,
    localizedDescription,
  );

  TestValidator.equals(
    "seo_title should match the created localized SEO title",
    retrievedLocalization.seo_title ?? null,
    localizedSeoTitle,
  );

  TestValidator.equals(
    "seo_description should match the created localized SEO description",
    retrievedLocalization.seo_description ?? null,
    localizedSeoDescription,
  );

  // Validate that the nested category summary refers to the correct category.
  TestValidator.predicate(
    "localization should contain a category summary",
    retrievedLocalization.category !== undefined &&
      retrievedLocalization.category !== null,
  );

  if (retrievedLocalization.category) {
    TestValidator.equals(
      "category summary id should match base category id",
      retrievedLocalization.category.id,
      category.id,
    );

    TestValidator.equals(
      "category summary slug should match base category slug",
      retrievedLocalization.category.slug,
      category.slug,
    );

    TestValidator.equals(
      "category summary name_en should match base category name_en",
      retrievedLocalization.category.name_en,
      category.name_en,
    );
  }
}
