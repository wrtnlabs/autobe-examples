import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";

/**
 * Validate that an authenticated admin can create a minimal active root leaf
 * category.
 *
 * Business flow:
 *
 * 1. Register a new administrator via POST /auth/admin/join to obtain an
 *    authenticated admin session.
 * 2. Using the authenticated admin connection, call POST
 *    /shoppingMall/admin/categories with a minimal
 *    IShoppingMallCategory.ICreate payload to create a root leaf category.
 * 3. Verify that the returned IShoppingMallCategory reflects the submitted fields,
 *    has a root-level parent_id (null/undefined), and contains proper lifecycle
 *    timestamps and soft-delete state.
 */
export async function test_api_admin_category_creation_minimal_leaf_root(
  connection: api.IConnection,
) {
  // 1. Register a new administrator (admin join)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    // Intentionally leave ip undefined to let backend/session default behavior apply
    href: "https://admin.shoppingmall.local/join", // any valid URI
    referrer: "https://shoppingmall.local/landing", // any valid URI
  } satisfies IShoppingMallAdminJoin.ICreate;

  const authorizedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(authorizedAdmin);

  // 2. Create a minimal root leaf category as this admin
  const createCategoryBody = {
    // parent_id omitted to create a root category
    slug: "electronics",
    name_en: "Electronics",
    description_en: null,
    status: "active",
    sort_order: 10,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const createdCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: createCategoryBody,
    });
  typia.assert<IShoppingMallCategory>(createdCategory);

  // 3. Business rule validations

  // 3-1. id must be a non-empty UUID string (typia.assert already validates format,
  //      here we just assert non-empty semantics)
  TestValidator.predicate(
    "created category id should be a non-empty string",
    createdCategory.id.length > 0,
  );

  // 3-2. parent_id should be null or undefined (root category)
  TestValidator.predicate(
    "root category must have null or undefined parent_id",
    createdCategory.parent_id === null ||
      createdCategory.parent_id === undefined,
  );

  // 3-3. Fields that should round-trip from request to response
  TestValidator.equals(
    "slug should match request",
    createdCategory.slug,
    createCategoryBody.slug,
  );
  TestValidator.equals(
    "name_en should match request",
    createdCategory.name_en,
    createCategoryBody.name_en,
  );
  TestValidator.equals(
    "status should match request",
    createdCategory.status,
    createCategoryBody.status,
  );
  TestValidator.equals(
    "sort_order should match request",
    createdCategory.sort_order,
    createCategoryBody.sort_order,
  );
  TestValidator.equals(
    "is_leaf should match request",
    createdCategory.is_leaf,
    createCategoryBody.is_leaf,
  );

  // description_en is optional and nullable; we explicitly set null and expect null in response
  TestValidator.predicate(
    "description_en should be null when created with null",
    createdCategory.description_en === null,
  );

  // 3-4. created_at and updated_at should be present (non-empty strings)
  TestValidator.predicate(
    "created_at must be a non-empty string",
    createdCategory.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at must be a non-empty string",
    createdCategory.updated_at.length > 0,
  );

  // 3-5. deleted_at should be null or undefined for a freshly created category
  TestValidator.predicate(
    "deleted_at should be null or undefined on fresh category",
    createdCategory.deleted_at === null ||
      createdCategory.deleted_at === undefined,
  );
}
