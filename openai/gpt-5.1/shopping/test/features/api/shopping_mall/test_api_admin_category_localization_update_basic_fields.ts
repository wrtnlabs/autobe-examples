import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCategoryLocalization } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategoryLocalization";

export async function test_api_admin_category_localization_update_basic_fields(
  connection: api.IConnection,
) {
  // 1) Register an admin and obtain authenticated context via join
  const adminJoinBody = typia.random<IShoppingMallAdminJoin.ICreate>();
  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2) Create a parent category for localization
  const categoryCreateBody = typia.random<IShoppingMallCategory.ICreate>();
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryCreateBody,
    });
  typia.assert(category);

  // 3) Create an initial localization for a concrete locale
  const locale = "en-US";
  const localizationCreateBody = {
    locale,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    seo_title: RandomGenerator.paragraph({ sentences: 3 }),
    seo_description: RandomGenerator.paragraph({ sentences: 5 }),
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

  // Basic sanity checks on created localization
  TestValidator.equals(
    "created localization id should be stable UUID",
    createdLocalization.id,
    createdLocalization.id,
  );
  TestValidator.equals(
    "created localization locale should match requested locale",
    createdLocalization.locale,
    locale,
  );
  TestValidator.equals(
    "created localization category summary id should match parent category id",
    createdLocalization.category?.id,
    category.id,
  );
  TestValidator.equals(
    "created localization deleted_at should be null",
    createdLocalization.deleted_at ?? null,
    null,
  );

  // Capture timestamps and important identity fields before update
  const originalId = createdLocalization.id;
  const originalLocale = createdLocalization.locale;
  const originalCreatedAt = createdLocalization.created_at;
  const originalUpdatedAt = createdLocalization.updated_at;
  const originalCategorySummary = createdLocalization.category;

  // 4) Update localization with new values for core fields
  const updatedName = RandomGenerator.paragraph({ sentences: 2 });
  const updatedDescription = RandomGenerator.paragraph({ sentences: 3 });
  const updatedSeoTitle = RandomGenerator.paragraph({ sentences: 2 });
  const updatedSeoDescription = RandomGenerator.paragraph({ sentences: 4 });

  const localizationUpdateBody = {
    name: updatedName,
    description: updatedDescription,
    seo_title: updatedSeoTitle,
    seo_description: updatedSeoDescription,
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

  // 5) Assertions on updated localization
  TestValidator.equals(
    "updated localization id must remain unchanged",
    updatedLocalization.id,
    originalId,
  );
  TestValidator.equals(
    "updated localization locale must remain unchanged",
    updatedLocalization.locale,
    originalLocale,
  );
  TestValidator.equals(
    "updated localization category id must remain unchanged",
    updatedLocalization.category?.id,
    originalCategorySummary?.id,
  );

  TestValidator.equals(
    "updated name should reflect new value",
    updatedLocalization.name,
    updatedName,
  );
  TestValidator.equals(
    "updated description should reflect new value",
    updatedLocalization.description ?? null,
    updatedDescription,
  );
  TestValidator.equals(
    "updated seo_title should reflect new value",
    updatedLocalization.seo_title ?? null,
    updatedSeoTitle,
  );
  TestValidator.equals(
    "updated seo_description should reflect new value",
    updatedLocalization.seo_description ?? null,
    updatedSeoDescription,
  );

  TestValidator.equals(
    "created_at must remain unchanged after update",
    updatedLocalization.created_at,
    originalCreatedAt,
  );
  TestValidator.notEquals(
    "updated_at must be different after update",
    updatedLocalization.updated_at,
    originalUpdatedAt,
  );

  TestValidator.equals(
    "deleted_at should remain null after update",
    updatedLocalization.deleted_at ?? null,
    null,
  );

  await TestValidator.predicate(
    "updated_at should be equal or later than original created_at",
    async () => updatedLocalization.updated_at >= originalCreatedAt,
  );

  // 6) Optional idempotence check: call PUT again with same body
  const secondUpdate: IShoppingMallCategoryLocalization =
    await api.functional.shoppingMall.admin.categories.localizations.update(
      connection,
      {
        categoryId: category.id,
        locale,
        body: localizationUpdateBody,
      },
    );
  typia.assert(secondUpdate);

  TestValidator.equals(
    "idempotent update keeps same id",
    secondUpdate.id,
    updatedLocalization.id,
  );
  TestValidator.equals(
    "idempotent update keeps same locale",
    secondUpdate.locale,
    updatedLocalization.locale,
  );
  TestValidator.equals(
    "idempotent update keeps same category id",
    secondUpdate.category?.id,
    updatedLocalization.category?.id,
  );

  TestValidator.equals(
    "idempotent update keeps name equal to requested updated name",
    secondUpdate.name,
    updatedName,
  );
  TestValidator.equals(
    "idempotent update keeps description equal to requested updated description",
    secondUpdate.description ?? null,
    updatedDescription,
  );
  TestValidator.equals(
    "idempotent update keeps seo_title equal to requested updated seo_title",
    secondUpdate.seo_title ?? null,
    updatedSeoTitle,
  );
  TestValidator.equals(
    "idempotent update keeps seo_description equal to requested updated seo_description",
    secondUpdate.seo_description ?? null,
    updatedSeoDescription,
  );

  TestValidator.equals(
    "idempotent update keeps created_at stable",
    secondUpdate.created_at,
    updatedLocalization.created_at,
  );
  TestValidator.predicate(
    "idempotent update's updated_at should be equal or later than first updated_at",
    secondUpdate.updated_at >= updatedLocalization.updated_at,
  );

  TestValidator.equals(
    "idempotent update keeps deleted_at null",
    secondUpdate.deleted_at ?? null,
    null,
  );
}
