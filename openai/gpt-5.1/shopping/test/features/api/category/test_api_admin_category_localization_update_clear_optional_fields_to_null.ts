import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCategoryLocalization } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategoryLocalization";

export async function test_api_admin_category_localization_update_clear_optional_fields_to_null(
  connection: api.IConnection,
) {
  // 1) Create and authenticate an admin via POST /auth/admin/join
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: "https://admin.shoppingmall.test/join",
    referrer: "https://shoppingmall.test/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2) Create a category via POST /shoppingMall/admin/categories
  const categoryCreateBody = {
    parent_id: null,
    slug: RandomGenerator.alphaNumeric(12),
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    description_en: RandomGenerator.paragraph({ sentences: 4 }),
    status: "active",
    sort_order: 1,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryCreateBody,
    });
  typia.assert(category);

  // 3) Create a localization with all optional fields non-null
  const locale = "en-US";
  const localizationCreateBody = {
    locale,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    seo_title: RandomGenerator.paragraph({ sentences: 1 }),
    seo_description: RandomGenerator.paragraph({ sentences: 4 }),
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

  // Basic invariants after creation
  TestValidator.equals(
    "created localization locale matches input",
    createdLocalization.locale,
    locale,
  );

  // Ensure category summary is present and matches parent category
  TestValidator.predicate(
    "created localization has category summary",
    createdLocalization.category !== undefined,
  );
  if (createdLocalization.category !== undefined) {
    TestValidator.equals(
      "created localization category id matches parent category",
      createdLocalization.category.id,
      category.id,
    );
  }

  TestValidator.predicate(
    "created localization description is non-null before update",
    createdLocalization.description !== null &&
      createdLocalization.description !== undefined,
  );
  TestValidator.predicate(
    "created localization seo_title is non-null before update",
    createdLocalization.seo_title !== null &&
      createdLocalization.seo_title !== undefined,
  );
  TestValidator.predicate(
    "created localization seo_description is non-null before update",
    createdLocalization.seo_description !== null &&
      createdLocalization.seo_description !== undefined,
  );

  const originalId = createdLocalization.id;
  const originalLocale = createdLocalization.locale;
  const originalCreatedAt = createdLocalization.created_at;
  const originalUpdatedAt = createdLocalization.updated_at;

  // 4) Call update with optional fields explicitly set to null
  const localizationUpdateBody = {
    description: null,
    seo_title: null,
    seo_description: null,
  } satisfies IShoppingMallCategoryLocalization.IUpdate;

  const updatedLocalization: IShoppingMallCategoryLocalization =
    await api.functional.shoppingMall.admin.categories.localizations.update(
      connection,
      {
        categoryId: category.id,
        locale: originalLocale,
        body: localizationUpdateBody,
      },
    );
  typia.assert(updatedLocalization);

  // 5) Validate invariants after update
  TestValidator.equals(
    "updated localization id remains the same",
    updatedLocalization.id,
    originalId,
  );
  TestValidator.equals(
    "updated localization locale remains the same",
    updatedLocalization.locale,
    originalLocale,
  );

  TestValidator.predicate(
    "updated localization has category summary",
    updatedLocalization.category !== undefined,
  );
  if (updatedLocalization.category !== undefined) {
    TestValidator.equals(
      "updated localization category summary id remains the same",
      updatedLocalization.category.id,
      category.id,
    );
  }

  // Optional fields should be cleared to null
  TestValidator.equals(
    "description cleared to null",
    updatedLocalization.description,
    null,
  );
  TestValidator.equals(
    "seo_title cleared to null",
    updatedLocalization.seo_title,
    null,
  );
  TestValidator.equals(
    "seo_description cleared to null",
    updatedLocalization.seo_description,
    null,
  );

  // created_at must stay the same, updated_at must be newer
  TestValidator.equals(
    "created_at is unchanged after update",
    updatedLocalization.created_at,
    originalCreatedAt,
  );

  TestValidator.predicate(
    "updated_at is later than original updated_at",
    new Date(updatedLocalization.updated_at).getTime() >
      new Date(originalUpdatedAt).getTime(),
  );
}
