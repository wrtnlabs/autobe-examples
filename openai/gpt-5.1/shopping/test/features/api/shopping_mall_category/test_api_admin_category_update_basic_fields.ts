import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";

export async function test_api_admin_category_update_basic_fields(
  connection: api.IConnection,
) {
  // 1. Register a new admin and obtain authenticated context
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

  // 2. Create an initial root category to update later
  const createCategoryBody = {
    parent_id: null,
    slug: RandomGenerator.alphaNumeric(12),
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    description_en: RandomGenerator.paragraph({ sentences: 5 }),
    status: "active",
    sort_order: 1,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const originalCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: createCategoryBody,
    });
  typia.assert(originalCategory);

  // Basic sanity checks on created category
  TestValidator.predicate(
    "created category has non-empty id",
    originalCategory.id.length > 0,
  );
  TestValidator.equals(
    "created root category has null parent_id",
    originalCategory.parent_id ?? null,
    null,
  );
  TestValidator.equals(
    "created category is not soft-deleted",
    originalCategory.deleted_at ?? null,
    null,
  );

  // 3. Prepare update payload changing multiple mutable fields
  const updatedSlug = RandomGenerator.alphaNumeric(12);
  const updatedName = RandomGenerator.paragraph({ sentences: 3 });
  const updatedDescription = RandomGenerator.paragraph({ sentences: 6 });
  const updatedStatus = "hidden";
  const updatedSortOrder = 2 as number & tags.Type<"int32">;
  const updatedIsLeaf = false;

  const updateBody = {
    slug: updatedSlug,
    name_en: updatedName,
    description_en: updatedDescription,
    status: updatedStatus,
    sort_order: updatedSortOrder,
    is_leaf: updatedIsLeaf,
  } satisfies IShoppingMallCategory.IUpdate;

  // 4. Execute update API
  const updatedCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.update(connection, {
      categoryId: originalCategory.id,
      body: updateBody,
    });
  typia.assert(updatedCategory);

  // 5. Validate invariants and updated fields
  TestValidator.equals(
    "category id is stable after update",
    updatedCategory.id,
    originalCategory.id,
  );
  TestValidator.equals(
    "created_at remains unchanged after update",
    updatedCategory.created_at,
    originalCategory.created_at,
  );

  TestValidator.equals("slug is updated", updatedCategory.slug, updatedSlug);
  TestValidator.equals(
    "name_en is updated",
    updatedCategory.name_en,
    updatedName,
  );
  TestValidator.equals(
    "description_en is updated",
    updatedCategory.description_en ?? null,
    updatedDescription,
  );
  TestValidator.equals(
    "status is updated",
    updatedCategory.status,
    updatedStatus,
  );
  TestValidator.equals(
    "sort_order is updated",
    updatedCategory.sort_order,
    updatedSortOrder,
  );
  TestValidator.equals(
    "is_leaf is updated",
    updatedCategory.is_leaf,
    updatedIsLeaf,
  );

  TestValidator.equals(
    "deleted_at remains null (not soft-deleted)",
    updatedCategory.deleted_at ?? null,
    null,
  );

  // 6. Validate updated_at has changed and is not earlier than original
  TestValidator.predicate(
    "updated_at differs from original after update",
    updatedCategory.updated_at !== originalCategory.updated_at,
  );

  const originalUpdatedAtMs = Date.parse(originalCategory.updated_at);
  const newUpdatedAtMs = Date.parse(updatedCategory.updated_at);

  TestValidator.predicate(
    "updated_at is not earlier than original updated_at",
    newUpdatedAtMs >= originalUpdatedAtMs,
  );
}
