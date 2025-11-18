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
 * Verify partial update of optional SEO fields on a category localization.
 *
 * Business goal: Ensure that an admin can update only SEO-related optional
 * fields of a category localization (seo_title, seo_description) without
 * overwriting other fields like name and description when those fields are
 * omitted from the update payload. Also confirm that identity fields remain
 * stable and timestamps behave as expected.
 *
 * Scenario steps:
 *
 * 1. Register and authenticate an admin via POST /auth/admin/join.
 * 2. Create a category via POST /shoppingMall/admin/categories.
 * 3. Create a localization for that category via POST
 *    /shoppingMall/admin/categories/{categoryId}/localizations.
 * 4. Update the localization via PUT
 *    /shoppingMall/admin/categories/{categoryId}/localizations/{locale}
 *    providing only seo_title and seo_description in the IUpdate body.
 * 5. Assert that:
 *
 *    - Id, locale, and category reference are unchanged.
 *    - Name and description are preserved.
 *    - Seo_title and seo_description are updated.
 *    - Created_at is unchanged and updated_at has advanced.
 */
export async function test_api_admin_category_localization_update_partial_optional_fields(
  connection: api.IConnection,
) {
  // 1. Admin join (auth) to obtain an authorized admin context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Create a category as the authenticated admin
  const categoryBody = {
    parent_id: null,
    slug: RandomGenerator.alphaNumeric(12),
    name_en: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 3,
      wordMax: 8,
    }),
    description_en: RandomGenerator.paragraph({
      sentences: 4,
      wordMin: 3,
      wordMax: 10,
    }),
    status: "active",
    sort_order: 1 satisfies number,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryBody,
    });
  typia.assert(category);

  // 3. Create the initial localization for the category
  const locale = "en-US";
  const originalName = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 3,
    wordMax: 8,
  });
  const originalDescription = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 3,
    wordMax: 10,
  });
  const originalSeoTitle = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 3,
    wordMax: 8,
  });
  const originalSeoDescription = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 3,
    wordMax: 10,
  });

  const localizationCreateBody = {
    locale,
    name: originalName,
    description: originalDescription,
    seo_title: originalSeoTitle,
    seo_description: originalSeoDescription,
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

  // Capture original state for later comparison
  const originalId = createdLocalization.id;
  const originalLocale = createdLocalization.locale;
  const originalCreatedAt = createdLocalization.created_at;
  const originalUpdatedAt = createdLocalization.updated_at;
  const originalCategorySummary = createdLocalization.category;

  // 4. Partial update: only SEO fields, omit name and description
  const newSeoTitle = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 3,
    wordMax: 8,
  });
  const newSeoDescription = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 3,
    wordMax: 10,
  });

  const localizationUpdateBody = {
    seo_title: newSeoTitle,
    seo_description: newSeoDescription,
  } satisfies IShoppingMallCategoryLocalization.IUpdate;

  const updatedLocalization: IShoppingMallCategoryLocalization =
    await api.functional.shoppingMall.admin.categories.localizations.update(
      connection,
      {
        categoryId: category.id,
        locale,
        body: localizationUpdateBody,
      },
    );
  typia.assert(updatedLocalization);

  // 5. State verification
  // 5-1. Identifier and locale stability
  TestValidator.equals(
    "localization id remains unchanged after SEO update",
    updatedLocalization.id,
    originalId,
  );

  TestValidator.equals(
    "localization locale remains unchanged after SEO update",
    updatedLocalization.locale,
    originalLocale,
  );

  if (
    originalCategorySummary !== undefined &&
    updatedLocalization.category !== undefined
  ) {
    TestValidator.equals(
      "category summary id in localization matches original category id",
      updatedLocalization.category.id,
      category.id,
    );

    TestValidator.equals(
      "category summary slug remains consistent across updates",
      updatedLocalization.category.slug,
      originalCategorySummary.slug,
    );
  }

  // 5-2. Non-updated fields stability (name, description)
  TestValidator.equals(
    "name remains unchanged when omitted from localization update payload",
    updatedLocalization.name,
    createdLocalization.name,
  );

  TestValidator.equals(
    "description remains unchanged when omitted from localization update payload",
    updatedLocalization.description,
    createdLocalization.description,
  );

  // 5-3. Updated SEO fields changed to new values
  TestValidator.equals(
    "seo_title is updated to new value after partial localization update",
    updatedLocalization.seo_title,
    newSeoTitle,
  );

  TestValidator.notEquals(
    "seo_title differs from original value after partial localization update",
    updatedLocalization.seo_title,
    createdLocalization.seo_title,
  );

  TestValidator.equals(
    "seo_description is updated to new value after partial localization update",
    updatedLocalization.seo_description,
    newSeoDescription,
  );

  TestValidator.notEquals(
    "seo_description differs from original value after partial localization update",
    updatedLocalization.seo_description,
    createdLocalization.seo_description,
  );

  // 5-4. Timestamp behavior
  TestValidator.equals(
    "created_at timestamp remains unchanged after localization update",
    updatedLocalization.created_at,
    originalCreatedAt,
  );

  TestValidator.notEquals(
    "updated_at timestamp changes after localization update",
    updatedLocalization.updated_at,
    originalUpdatedAt,
  );

  // Optional: chronological sanity check for timestamps
  const createdAtDate = new Date(originalCreatedAt);
  const updatedAtDate = new Date(updatedLocalization.updated_at);

  TestValidator.predicate(
    "updated_at must be same as or later than created_at for localization",
    updatedAtDate.getTime() >= createdAtDate.getTime(),
  );

  // Optional: ensure soft-delete flag remains inactive
  TestValidator.equals(
    "deleted_at remains null or undefined after localization SEO update",
    updatedLocalization.deleted_at ?? null,
    createdLocalization.deleted_at ?? null,
  );
}
