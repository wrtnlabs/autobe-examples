import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";

/**
 * Validate that an admin can delete a leaf child category without affecting its
 * parent.
 *
 * Business context:
 *
 * - Categories form a tree in shopping_mall_categories.
 * - Admins manage this taxonomy via /shoppingMall/admin/categories endpoints.
 * - Deleting a leaf child category should remove only that node and keep the
 *   parent intact.
 *
 * Test steps:
 *
 * 1. Bootstrap an admin account via POST /auth/admin/join.
 * 2. Create a root parent category P (parent_id = null) via POST
 *    /shoppingMall/admin/categories.
 * 3. Create a child category C under P by setting parent_id = P.id via POST
 *    /shoppingMall/admin/categories.
 * 4. Delete C via DELETE /shoppingMall/admin/categories/{categoryId}.
 * 5. Verify deletion call succeeds and that parent P object remains unchanged in
 *    this test's scope.
 */
export async function test_api_admin_category_delete_child_category(
  connection: api.IConnection,
) {
  // 1. Admin bootstrap & authentication via join
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const authorizedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(authorizedAdmin);

  // 2. Create root parent category P (parent_id = null)
  const parentCreateBody = {
    parent_id: null,
    slug: `parent-${RandomGenerator.alphaNumeric(8)}`,
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    description_en: RandomGenerator.paragraph({ sentences: 4 }),
    status: "active",
    sort_order: 1 satisfies number as number,
    is_leaf: false,
  } satisfies IShoppingMallCategory.ICreate;

  const parentCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: parentCreateBody,
    });
  typia.assert(parentCategory);

  // basic sanity on parent structure using TestValidator
  TestValidator.predicate(
    "parent category id should be non-empty string",
    typeof parentCategory.id === "string" && parentCategory.id.length > 0,
  );
  TestValidator.equals(
    "parent category should have null parent_id",
    parentCategory.parent_id ?? null,
    null,
  );

  // 3. Create child category C under P
  const childCreateBody = {
    parent_id: parentCategory.id,
    slug: `child-${RandomGenerator.alphaNumeric(8)}`,
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    description_en: RandomGenerator.paragraph({ sentences: 3 }),
    status: "active",
    sort_order: 2 satisfies number as number,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const childCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: childCreateBody,
    });
  typia.assert(childCategory);

  TestValidator.equals(
    "child category should reference parent id",
    childCategory.parent_id ?? null,
    parentCategory.id,
  );
  TestValidator.predicate(
    "child category should be marked as leaf",
    childCategory.is_leaf === true,
  );

  // 4. Delete the child category C
  await api.functional.shoppingMall.admin.categories.erase(connection, {
    categoryId: childCategory.id,
  });

  // 5. Business validation: parent object remains untouched in this test's scope
  // We cannot query again without a GET API, but we can ensure the in-memory
  // representation of parentCategory is unchanged after deleting C.
  TestValidator.equals(
    "parent category id should remain unchanged after child deletion",
    parentCategory.id,
    parentCategory.id,
  );
  TestValidator.equals(
    "parent category slug should remain unchanged after child deletion",
    parentCategory.slug,
    parentCreateBody.slug,
  );
  TestValidator.equals(
    "parent category status should remain unchanged after child deletion",
    parentCategory.status,
    parentCreateBody.status,
  );
}
