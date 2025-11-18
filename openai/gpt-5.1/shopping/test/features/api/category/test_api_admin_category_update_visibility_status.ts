import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";

/**
 * Validate admin-driven lifecycle/visibility updates on shopping mall
 * categories.
 *
 * Business context:
 *
 * - Categories are part of the global shoppingMall taxonomy and control
 *   navigation, visibility, and product assignment.
 * - Only admins can manage these categories via /shoppingMall/admin/categories.
 * - The `status` field drives lifecycle/visibility (e.g., active, hidden,
 *   deprecated) and must be safely updatable without disturbing other fields.
 *
 * This test verifies that:
 *
 * 1. An admin created via POST /auth/admin/join can create a category.
 * 2. The admin can then update only the `status` field via PUT
 *    /shoppingMall/admin/categories/{categoryId} using
 *    IShoppingMallCategory.IUpdate.
 * 3. Non-status fields like id, slug, name_en, and created_at remain stable across
 *    status-only updates.
 * 4. Multiple sequential status transitions (e.g., active -> hidden -> deprecated)
 *    are supported and persisted.
 */
export async function test_api_admin_category_update_visibility_status(
  connection: api.IConnection,
) {
  // 1. Register an admin (join) to obtain an authorized admin context.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    // For e2e tests, these can be arbitrary but valid URIs.
    href: "https://admin.test.local/join",
    referrer: "https://admin.test.local/",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: joinBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create a new category as this admin.
  const createCategoryBody = {
    parent_id: null,
    slug: RandomGenerator.alphaNumeric(12),
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    description_en: RandomGenerator.paragraph({ sentences: 5 }),
    status: "active",
    sort_order: typia.random<number & tags.Type<"int32">>(),
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const createdCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: createCategoryBody,
    });
  typia.assert<IShoppingMallCategory>(createdCategory);

  // Capture baseline fields that must remain stable across updates.
  const baseId = createdCategory.id;
  const baseSlug = createdCategory.slug;
  const baseNameEn = createdCategory.name_en;
  const baseCreatedAt = createdCategory.created_at;

  TestValidator.equals(
    "initial category status is active",
    createdCategory.status,
    createCategoryBody.status,
  );

  // 3. First visibility update: active -> hidden.
  const firstStatus = "hidden";
  const firstUpdateBody = {
    status: firstStatus,
  } satisfies IShoppingMallCategory.IUpdate;

  const updatedCategory1 =
    await api.functional.shoppingMall.admin.categories.update(connection, {
      categoryId: createdCategory.id,
      body: firstUpdateBody,
    });
  typia.assert<IShoppingMallCategory>(updatedCategory1);

  // Validate that only status changed, and identity/core fields stayed the same.
  TestValidator.equals(
    "category id remains unchanged after first status update",
    updatedCategory1.id,
    baseId,
  );
  TestValidator.equals(
    "category slug remains unchanged after first status update",
    updatedCategory1.slug,
    baseSlug,
  );
  TestValidator.equals(
    "category name_en remains unchanged after first status update",
    updatedCategory1.name_en,
    baseNameEn,
  );
  TestValidator.equals(
    "category created_at remains unchanged after first status update",
    updatedCategory1.created_at,
    baseCreatedAt,
  );
  TestValidator.equals(
    "category status updated to hidden",
    updatedCategory1.status,
    firstStatus,
  );

  // 4. Second visibility update: hidden -> deprecated.
  const secondStatus = "deprecated";
  const secondUpdateBody = {
    status: secondStatus,
  } satisfies IShoppingMallCategory.IUpdate;

  const updatedCategory2 =
    await api.functional.shoppingMall.admin.categories.update(connection, {
      categoryId: createdCategory.id,
      body: secondUpdateBody,
    });
  typia.assert<IShoppingMallCategory>(updatedCategory2);

  // Validate invariants again after second update.
  TestValidator.equals(
    "category id remains unchanged after second status update",
    updatedCategory2.id,
    baseId,
  );
  TestValidator.equals(
    "category slug remains unchanged after second status update",
    updatedCategory2.slug,
    baseSlug,
  );
  TestValidator.equals(
    "category name_en remains unchanged after second status update",
    updatedCategory2.name_en,
    baseNameEn,
  );
  TestValidator.equals(
    "category created_at remains unchanged after second status update",
    updatedCategory2.created_at,
    baseCreatedAt,
  );
  TestValidator.equals(
    "category status updated to deprecated",
    updatedCategory2.status,
    secondStatus,
  );
}
