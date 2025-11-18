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
 * Validate that category localization retrieval returns complete localization
 * and category summary fields.
 *
 * Business flow:
 *
 * 1. Admin joins (POST /auth/admin/join) to obtain an authenticated admin context.
 * 2. Admin creates a category (POST /shoppingMall/admin/categories) with realistic
 *    taxonomy data.
 * 3. Admin creates a localization for that category (POST
 *    /shoppingMall/admin/categories/{categoryId}/localizations) with all
 *    optional SEO fields filled.
 * 4. Public client fetches the localization by categoryId and locale (GET
 *    /shoppingMall/categories/{categoryId}/localizations/{locale}).
 * 5. The response is validated for DTO completeness and value consistency between
 *    create and read views.
 */
export async function test_api_category_localizations_at_returns_complete_localization_fields(
  connection: api.IConnection,
) {
  // 1. Admin joins to establish authenticated context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a category with meaningful attributes
  const categoryCreateBody = {
    parent_id: null,
    slug: `electronics-${RandomGenerator.alphaNumeric(8)}`,
    name_en: RandomGenerator.name(2),
    description_en: RandomGenerator.paragraph({ sentences: 4 }),
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const createdCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryCreateBody,
    });
  typia.assert(createdCategory);

  // Basic consistency between request and created category
  TestValidator.equals(
    "category slug matches create input",
    createdCategory.slug,
    categoryCreateBody.slug,
  );
  TestValidator.equals(
    "category name_en matches create input",
    createdCategory.name_en,
    categoryCreateBody.name_en,
  );
  TestValidator.equals(
    "category description_en matches create input",
    createdCategory.description_en ?? null,
    categoryCreateBody.description_en ?? null,
  );
  TestValidator.equals(
    "category status matches create input",
    createdCategory.status,
    categoryCreateBody.status,
  );
  TestValidator.equals(
    "category sort_order matches create input",
    createdCategory.sort_order,
    categoryCreateBody.sort_order,
  );
  TestValidator.equals(
    "category is_leaf matches create input",
    createdCategory.is_leaf,
    categoryCreateBody.is_leaf,
  );
  TestValidator.equals(
    "category parent_id matches create input",
    createdCategory.parent_id ?? null,
    categoryCreateBody.parent_id ?? null,
  );

  // 3. Create a localization for that category with all optional fields set
  const localeCode = "en-US";
  const localizationCreateBody = {
    locale: localeCode,
    name: `${createdCategory.name_en} localized`,
    description: RandomGenerator.paragraph({ sentences: 5 }),
    seo_title: `${createdCategory.name_en} SEO Title`,
    seo_description: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies IShoppingMallCategoryLocalization.ICreate;

  const createdLocalization: IShoppingMallCategoryLocalization =
    await api.functional.shoppingMall.admin.categories.localizations.create(
      connection,
      {
        categoryId: createdCategory.id,
        body: localizationCreateBody,
      },
    );
  typia.assert(createdLocalization);

  // Verify created localization basic consistency
  TestValidator.equals(
    "created localization locale matches input",
    createdLocalization.locale,
    localizationCreateBody.locale,
  );
  TestValidator.equals(
    "created localization name matches input",
    createdLocalization.name,
    localizationCreateBody.name,
  );
  TestValidator.equals(
    "created localization description matches input",
    createdLocalization.description ?? null,
    localizationCreateBody.description ?? null,
  );
  TestValidator.equals(
    "created localization seo_title matches input",
    createdLocalization.seo_title ?? null,
    localizationCreateBody.seo_title ?? null,
  );
  TestValidator.equals(
    "created localization seo_description matches input",
    createdLocalization.seo_description ?? null,
    localizationCreateBody.seo_description ?? null,
  );

  // 4. Public storefront client fetches localization by categoryId and locale
  const fetchedLocalization: IShoppingMallCategoryLocalization =
    await api.functional.shoppingMall.categories.localizations.at(connection, {
      categoryId: createdCategory.id,
      locale: localeCode,
    });
  typia.assert(fetchedLocalization);

  // 5. Validate DTO completeness and value consistency
  // Top-level localization identity and locale
  TestValidator.equals(
    "fetched localization id matches created localization id",
    fetchedLocalization.id,
    createdLocalization.id,
  );
  TestValidator.equals(
    "fetched localization locale matches requested locale",
    fetchedLocalization.locale,
    localeCode,
  );

  // Localized content fields
  TestValidator.equals(
    "fetched localization name matches created",
    fetchedLocalization.name,
    localizationCreateBody.name,
  );
  TestValidator.equals(
    "fetched localization description matches created",
    fetchedLocalization.description ?? null,
    localizationCreateBody.description ?? null,
  );
  TestValidator.equals(
    "fetched localization seo_title matches created",
    fetchedLocalization.seo_title ?? null,
    localizationCreateBody.seo_title ?? null,
  );
  TestValidator.equals(
    "fetched localization seo_description matches created",
    fetchedLocalization.seo_description ?? null,
    localizationCreateBody.seo_description ?? null,
  );

  // Audit timestamps should be non-empty ISO date-time strings
  TestValidator.predicate(
    "fetched localization created_at is non-empty",
    fetchedLocalization.created_at.length > 0,
  );
  TestValidator.predicate(
    "fetched localization updated_at is non-empty",
    fetchedLocalization.updated_at.length > 0,
  );

  // Active localization should not be soft-deleted
  TestValidator.equals(
    "fetched localization deleted_at is null for active localization",
    fetchedLocalization.deleted_at ?? null,
    null,
  );

  // Nested category summary must be present and consistent
  TestValidator.predicate(
    "fetched localization has embedded category summary",
    fetchedLocalization.category !== undefined,
  );

  const categorySummary = fetchedLocalization.category!;
  typia.assert<IShoppingMallCategory.ISummary>(categorySummary);

  TestValidator.equals(
    "category summary id matches created category id",
    categorySummary.id,
    createdCategory.id,
  );
  TestValidator.equals(
    "category summary slug matches created category",
    categorySummary.slug,
    createdCategory.slug,
  );
  TestValidator.equals(
    "category summary name_en matches created category",
    categorySummary.name_en,
    createdCategory.name_en,
  );
  TestValidator.equals(
    "category summary description_en matches created category",
    categorySummary.description_en ?? null,
    createdCategory.description_en ?? null,
  );
  TestValidator.equals(
    "category summary status matches created category",
    categorySummary.status,
    createdCategory.status,
  );
  TestValidator.equals(
    "category summary sort_order matches created category",
    categorySummary.sort_order,
    createdCategory.sort_order,
  );
  TestValidator.equals(
    "category summary is_leaf matches created category",
    categorySummary.is_leaf,
    createdCategory.is_leaf,
  );
  TestValidator.equals(
    "category summary parent_id matches created category",
    categorySummary.parent_id ?? null,
    createdCategory.parent_id ?? null,
  );

  TestValidator.predicate(
    "category summary created_at is non-empty",
    categorySummary.created_at.length > 0,
  );
  TestValidator.predicate(
    "category summary updated_at is non-empty",
    categorySummary.updated_at.length > 0,
  );
}
