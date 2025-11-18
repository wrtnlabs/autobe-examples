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
 * Validate creating a category localization with minimal optional fields.
 *
 * Business flow:
 *
 * 1. Join as an admin to obtain an authenticated admin context.
 * 2. Create a base category using minimal required fields.
 * 3. Create a localization for that category providing only required fields and
 *    setting optional SEO/description fields explicitly to null.
 * 4. Verify that the created localization reflects the expected nullable semantics
 *    and is linked to the correct category.
 */
export async function test_api_admin_category_localization_create_with_minimal_optional_fields(
  connection: api.IConnection,
) {
  // 1. Admin join (authentication context)
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
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create a base category with minimal required fields
  const categoryCreateBody = {
    slug: RandomGenerator.alphabets(12),
    name_en: RandomGenerator.name(2),
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryCreateBody,
    });
  typia.assert<IShoppingMallCategory>(category);

  TestValidator.predicate(
    "created category has matching slug",
    () => category.slug === categoryCreateBody.slug,
  );

  // 3. Create localization with minimal optional fields explicitly set to null
  const localizationCreateBody = {
    locale: "en-US",
    name: `${categoryCreateBody.name_en} Localized`,
    description: null,
    seo_title: null,
    seo_description: null,
  } satisfies IShoppingMallCategoryLocalization.ICreate;

  const localization: IShoppingMallCategoryLocalization =
    await api.functional.shoppingMall.admin.categories.localizations.create(
      connection,
      {
        categoryId: category.id,
        body: localizationCreateBody,
      },
    );
  typia.assert<IShoppingMallCategoryLocalization>(localization);

  // 4. Validate core fields and nullable semantics
  TestValidator.predicate(
    "localization id should be a non-empty string",
    typeof localization.id === "string" && localization.id.length > 0,
  );

  TestValidator.equals(
    "locale should match the requested locale",
    localization.locale,
    localizationCreateBody.locale,
  );

  TestValidator.equals(
    "name should match the requested localized name",
    localization.name,
    localizationCreateBody.name,
  );

  TestValidator.equals(
    "description should be null when explicitly set to null",
    localization.description ?? null,
    null,
  );

  TestValidator.equals(
    "seo_title should be null when explicitly set to null",
    localization.seo_title ?? null,
    null,
  );

  TestValidator.equals(
    "seo_description should be null when explicitly set to null",
    localization.seo_description ?? null,
    null,
  );

  TestValidator.predicate(
    "created_at should be a non-empty date-time string",
    typeof localization.created_at === "string" &&
      localization.created_at.length > 0,
  );

  TestValidator.predicate(
    "updated_at should be a non-empty date-time string",
    typeof localization.updated_at === "string" &&
      localization.updated_at.length > 0,
  );

  TestValidator.equals(
    "newly created localization should not be soft-deleted",
    localization.deleted_at ?? null,
    null,
  );

  // 5. Validate category association
  TestValidator.predicate(
    "localization should contain a category summary object",
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
