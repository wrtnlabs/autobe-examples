import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCategoryLocalization } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategoryLocalization";

export async function test_api_admin_category_localization_create_for_child_category(
  connection: api.IConnection,
) {
  // 1. Admin join & authentication
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create root category (parent_id null)
  const rootCategoryBody = {
    parent_id: null,
    slug: RandomGenerator.paragraph({ sentences: 1, wordMin: 5, wordMax: 10 }),
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
    sort_order: typia.random<number & tags.Type<"int32">>(),
    is_leaf: false,
  } satisfies IShoppingMallCategory.ICreate;

  const rootCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: rootCategoryBody,
    });
  typia.assert(rootCategory);

  const rootCategoryId = rootCategory.id;

  TestValidator.equals(
    "root category should be root (parent_id null)",
    rootCategory.parent_id,
    null,
  );

  // 3. Create child category under root
  const childCategoryBody = {
    parent_id: rootCategory.id,
    slug: RandomGenerator.paragraph({ sentences: 1, wordMin: 5, wordMax: 10 }),
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
    sort_order: typia.random<number & tags.Type<"int32">>(),
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const childCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: childCategoryBody,
    });
  typia.assert(childCategory);

  TestValidator.equals(
    "child category parent_id should equal root id",
    childCategory.parent_id,
    rootCategory.id,
  );

  // 4. Create localization for child category
  const locale = "fr-FR";
  const localizationBody = {
    locale,
    name: RandomGenerator.paragraph({ sentences: 2, wordMin: 4, wordMax: 8 }),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 3,
      wordMax: 10,
    }),
    seo_title: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 5,
      wordMax: 10,
    }),
    seo_description: RandomGenerator.paragraph({
      sentences: 6,
      wordMin: 3,
      wordMax: 10,
    }),
  } satisfies IShoppingMallCategoryLocalization.ICreate;

  const localization: IShoppingMallCategoryLocalization =
    await api.functional.shoppingMall.admin.categories.localizations.create(
      connection,
      {
        categoryId: childCategory.id,
        body: localizationBody,
      },
    );
  typia.assert(localization);

  // 5. Validate localization fields
  TestValidator.equals(
    "localization locale should match request",
    localization.locale,
    localizationBody.locale,
  );
  TestValidator.equals(
    "localization name should match request",
    localization.name,
    localizationBody.name,
  );
  TestValidator.equals(
    "localization description should match request",
    localization.description,
    localizationBody.description,
  );
  TestValidator.equals(
    "localization seo_title should match request",
    localization.seo_title,
    localizationBody.seo_title,
  );
  TestValidator.equals(
    "localization seo_description should match request",
    localization.seo_description,
    localizationBody.seo_description,
  );

  TestValidator.equals(
    "localization deleted_at should be null",
    localization.deleted_at,
    null,
  );

  // Validate category summary relation
  TestValidator.predicate(
    "localization should contain category summary",
    localization.category !== undefined,
  );

  if (localization.category !== undefined) {
    const summary = localization.category;
    TestValidator.equals(
      "summary id should be child category id",
      summary.id,
      childCategory.id,
    );
    TestValidator.equals(
      "summary parent_id should be root category id",
      summary.parent_id,
      rootCategory.id,
    );
    TestValidator.equals(
      "summary slug should equal child slug",
      summary.slug,
      childCategory.slug,
    );
    TestValidator.equals(
      "summary name_en should equal child name_en",
      summary.name_en,
      childCategory.name_en,
    );
    TestValidator.equals(
      "summary status should equal child status",
      summary.status,
      childCategory.status,
    );
    TestValidator.equals(
      "summary is_leaf should equal child is_leaf",
      summary.is_leaf,
      childCategory.is_leaf,
    );
  }

  // 6. Validate root category remained unaffected using original object snapshot
  TestValidator.equals(
    "root category id should remain unchanged",
    rootCategory.id,
    rootCategoryId,
  );
  TestValidator.equals(
    "root category parent_id should still be null",
    rootCategory.parent_id,
    null,
  );
  TestValidator.equals(
    "root category slug should still equal initial payload",
    rootCategory.slug,
    rootCategoryBody.slug,
  );
  TestValidator.equals(
    "root category name_en should still equal initial payload",
    rootCategory.name_en,
    rootCategoryBody.name_en,
  );
  TestValidator.equals(
    "root category status should still equal initial payload",
    rootCategory.status,
    rootCategoryBody.status,
  );
  TestValidator.equals(
    "root category is_leaf should still equal initial payload",
    rootCategory.is_leaf,
    rootCategoryBody.is_leaf,
  );
}
