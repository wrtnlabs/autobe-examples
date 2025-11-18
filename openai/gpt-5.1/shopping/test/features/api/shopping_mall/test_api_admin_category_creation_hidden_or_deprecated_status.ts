import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";

/**
 * Validate admin creation of a non-active catalog category (hidden/deprecated).
 *
 * Business goal: Ensure that an authenticated shoppingMall administrator can
 * create a root-level category with a non-active lifecycle status such as
 * "hidden" or "deprecated", and that the persisted category reflects this
 * status along with correct hierarchy and lifecycle fields.
 *
 * Simplified scenario (aligned with available SDK):
 *
 * 1. Register a new admin via POST /auth/admin/join to obtain an authenticated
 *    admin context (IShoppingMallAdmin.IAuthorized).
 * 2. Using this admin-authenticated connection, call POST
 *    /shoppingMall/admin/categories with an IShoppingMallCategory.ICreate
 *    payload that:
 *
 *    - Has parent_id explicitly set to null (root category).
 *    - Uses a deterministic slug such as "archive".
 *    - Uses name_en "Archived Items".
 *    - Optionally sets description_en to a random paragraph or null.
 *    - Sets status to a non-active value (e.g. "hidden").
 *    - Provides a valid integer sort_order.
 *    - Sets is_leaf to true.
 * 3. Assert that the created IShoppingMallCategory:
 *
 *    - Has the same slug, name_en, and status as requested.
 *    - Has parent_id null (root category).
 *    - Has is_leaf true.
 *    - Has deleted_at null, confirming it is not soft-deleted.
 *    - Has created_at and updated_at filled with ISO 8601 date-time strings.
 *
 * Note: The original scenario mentioned validating behavior of a separate
 * public GET /shoppingMall/categories/{categoryId} endpoint, but such an SDK
 * function is not provided in the current materials. Therefore, this test
 * validates visibility-related behavior solely through the response from the
 * admin create operation, ensuring that lifecycle status and audit fields are
 * correctly reflected in the created category record.
 */
export async function test_api_admin_category_creation_hidden_or_deprecated_status(
  connection: api.IConnection,
) {
  // 1. Admin join to obtain authenticated context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: "https://admin.test.local/join", // realistic admin join URL
    referrer: "https://admin.test.local/landing", // realistic referrer URL
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Prepare category creation payload with non-active status
  const slug = "archive";
  const nameEn = "Archived Items";
  const nonActiveStatus = "hidden"; // representative non-active lifecycle state

  const categoryCreateBody = {
    parent_id: null,
    slug,
    name_en: nameEn,
    description_en: RandomGenerator.paragraph({ sentences: 3 }),
    status: nonActiveStatus,
    sort_order: 100,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const createdCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryCreateBody,
    });
  typia.assert<IShoppingMallCategory>(createdCategory);

  // 3. Business assertions on created category
  TestValidator.equals(
    "created category slug matches request",
    createdCategory.slug,
    slug,
  );
  TestValidator.equals(
    "created category name_en matches request",
    createdCategory.name_en,
    nameEn,
  );
  TestValidator.equals(
    "created category status preserves non-active value",
    createdCategory.status,
    nonActiveStatus,
  );

  TestValidator.equals(
    "root category has null parent_id",
    createdCategory.parent_id ?? null,
    null,
  );

  TestValidator.equals(
    "created category is_leaf matches request",
    createdCategory.is_leaf,
    true,
  );

  TestValidator.equals(
    "created category deleted_at remains null",
    createdCategory.deleted_at ?? null,
    null,
  );

  // Audit timestamps should be present and well-formed; typia.assert has
  // already validated their format, so here we only assert non-nullness.
  TestValidator.predicate(
    "created_at is non-empty string",
    createdCategory.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is non-empty string",
    createdCategory.updated_at.length > 0,
  );
}
