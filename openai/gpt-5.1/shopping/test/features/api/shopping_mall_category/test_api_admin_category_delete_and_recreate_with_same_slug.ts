import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";

/**
 * Validate admin can delete a category and recreate another under the same
 * parent with the same slug.
 *
 * Business goal
 *
 * - Ensure that after deleting a category, the admin can reuse the same slug
 *   under the same parent when creating a new category, and that the new
 *   category gets a different id while keeping the slug stable.
 *
 * Steps
 *
 * 1. Join as an admin using POST /auth/admin/join to obtain an authorized admin
 *    context (Authorization header managed by SDK).
 * 2. Create a parent category P as a root category (parent_id: null).
 * 3. Create a child category C under P with a specific slug S.
 * 4. Delete C using DELETE /shoppingMall/admin/categories/{categoryId}.
 * 5. Create a new child category C2 under the same parent P with the same slug S.
 * 6. Assert that:
 *
 *    - C2.slug equals S.
 *    - C2.parent_id equals P.id.
 *    - C2.id is different from C.id.
 */
export async function test_api_admin_category_delete_and_recreate_with_same_slug(
  connection: api.IConnection,
) {
  // 1. Admin join & authentication
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create parent category P (root category)
  const parentCreateBody = {
    parent_id: null,
    slug: `parent-${RandomGenerator.alphaNumeric(8)}`,
    name_en: RandomGenerator.paragraph({ sentences: 3 }),
    description_en: RandomGenerator.paragraph({ sentences: 5 }),
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
    is_leaf: false,
  } satisfies IShoppingMallCategory.ICreate;

  const parentCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: parentCreateBody,
    });
  typia.assert<IShoppingMallCategory>(parentCategory);

  // 3. Create child category C under P with slug S
  const slugS = `slug-${RandomGenerator.alphaNumeric(12)}`;

  const childCreateBody = {
    parent_id: parentCategory.id,
    slug: slugS,
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    description_en: RandomGenerator.paragraph({ sentences: 4 }),
    status: "active",
    sort_order: 10 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const originalCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: childCreateBody,
    });
  typia.assert<IShoppingMallCategory>(originalCategory);

  // 4. Delete C by id
  await api.functional.shoppingMall.admin.categories.erase(connection, {
    categoryId: originalCategory.id,
  });

  // 5. Recreate child category C2 under same parent with same slug S
  const recreateBody = {
    parent_id: parentCategory.id,
    slug: slugS,
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    description_en: RandomGenerator.paragraph({ sentences: 3 }),
    status: "active",
    sort_order: 20 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const recreatedCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: recreateBody,
    });
  typia.assert<IShoppingMallCategory>(recreatedCategory);

  // 6. Assertions
  TestValidator.equals(
    "recreated category should have same slug as original",
    recreatedCategory.slug,
    slugS,
  );

  TestValidator.equals(
    "recreated category should have same parent as original",
    recreatedCategory.parent_id,
    parentCategory.id,
  );

  TestValidator.notEquals(
    "recreated category should have different id from original",
    recreatedCategory.id,
    originalCategory.id,
  );
}
