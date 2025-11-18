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
 * Validate that an authenticated admin can create a localization record for a
 * freshly created category.
 *
 * Business flow:
 *
 * 1. Register a new admin via POST /auth/admin/join to obtain an authenticated
 *    admin context (SDK will inject Authorization header).
 * 2. Create a root category via POST /shoppingMall/admin/categories using
 *    IShoppingMallCategory.ICreate.
 * 3. Create a new localization for that category via POST
 *    /shoppingMall/admin/categories/{categoryId}/localizations using
 *    IShoppingMallCategoryLocalization.ICreate.
 * 4. Assert that the localization response echoes our input fields, is not
 *    soft-deleted, and is correctly associated with the newly created
 *    category.
 */
export async function test_api_admin_category_localization_create_for_new_category(
  connection: api.IConnection,
) {
  // 1. Admin join (registration + implicit login)
  const adminJoinBody = {
    email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(16),
    // Let IP be omitted (undefined) to allow server-side extraction.
    href: "https://admin.example.com/signup",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a root category
  const categoryCreateBody = {
    parent_id: null,
    slug: `root-${RandomGenerator.alphaNumeric(10)}`,
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    description_en: RandomGenerator.paragraph({ sentences: 4 }),
    status: "active",
    sort_order: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryCreateBody,
    });
  typia.assert(category);

  // Validate that category mirrors our input for core fields
  TestValidator.equals(
    "category slug should match input slug",
    category.slug,
    categoryCreateBody.slug,
  );
  TestValidator.equals(
    "category name_en should match input name_en",
    category.name_en,
    categoryCreateBody.name_en,
  );
  TestValidator.equals(
    "category description_en should match input description_en",
    category.description_en ?? null,
    categoryCreateBody.description_en ?? null,
  );
  TestValidator.equals(
    "category status should match input status",
    category.status,
    categoryCreateBody.status,
  );
  TestValidator.equals(
    "category sort_order should match input sort_order",
    category.sort_order,
    categoryCreateBody.sort_order,
  );
  TestValidator.equals(
    "category is_leaf should match input is_leaf",
    category.is_leaf,
    categoryCreateBody.is_leaf,
  );
  TestValidator.equals(
    "category parent_id should be null for root category",
    category.parent_id ?? null,
    categoryCreateBody.parent_id ?? null,
  );

  // 3. Create a localization for the new category
  const locale = "ko-KR";
  const localizationCreateBody = {
    locale,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    seo_title: RandomGenerator.paragraph({ sentences: 2 }),
    seo_description: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies IShoppingMallCategoryLocalization.ICreate;

  const localization: IShoppingMallCategoryLocalization =
    await api.functional.shoppingMall.admin.categories.localizations.create(
      connection,
      {
        categoryId: category.id,
        body: localizationCreateBody,
      },
    );
  typia.assert(localization);

  // 4. Business assertions on localization
  TestValidator.equals(
    "localization locale should match requested locale",
    localization.locale,
    localizationCreateBody.locale,
  );
  TestValidator.equals(
    "localization name should match requested name",
    localization.name,
    localizationCreateBody.name,
  );
  TestValidator.equals(
    "localization description should match requested description",
    localization.description ?? null,
    localizationCreateBody.description ?? null,
  );
  TestValidator.equals(
    "localization seo_title should match requested seo_title",
    localization.seo_title ?? null,
    localizationCreateBody.seo_title ?? null,
  );
  TestValidator.equals(
    "localization seo_description should match requested seo_description",
    localization.seo_description ?? null,
    localizationCreateBody.seo_description ?? null,
  );

  TestValidator.equals(
    "fresh localization should not be soft-deleted (deleted_at null)",
    localization.deleted_at ?? null,
    null,
  );

  // category association must be present and reference same category id
  TestValidator.predicate(
    "localization.category should be present",
    localization.category !== undefined && localization.category !== null,
  );
  if (localization.category !== undefined && localization.category !== null) {
    TestValidator.equals(
      "localization.category.id should match created category id",
      localization.category.id,
      category.id,
    );
  }
}
