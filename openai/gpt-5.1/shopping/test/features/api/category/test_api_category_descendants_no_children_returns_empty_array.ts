import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCategory";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";

/**
 * Verify that the descendants listing for a category with no children returns
 * an empty array.
 *
 * Business goal: Ensure that the taxonomy hierarchy endpoint for descendants
 * behaves correctly when the selected ancestor category has no child categories
 * at any depth. Even in this empty case, the API must:
 *
 * - Respond successfully
 * - Return a valid pagination envelope
 * - Provide an empty data array
 * - Not include the ancestor category itself as a descendant
 *
 * Test flow:
 *
 * 1. Join as an admin using POST /auth/admin/join, which also establishes an
 *    authenticated admin context in the SDK connection.
 * 2. Create a single category via POST /shoppingMall/admin/categories. This
 *    category will act as the ancestor for the descendants query. Do not create
 *    any other categories that reference it as parent_id so that it has no
 *    descendants.
 * 3. Call GET /shoppingMall/categories/{categoryId}/descendants with the created
 *    category.id.
 * 4. Validate that the response type matches IPageIShoppingMallCategory.ISummary
 *    using typia.assert.
 * 5. Validate business rules with TestValidator:
 *
 *    - Data is an empty array (length === 0)
 *    - Pagination.records is 0
 *    - Pagination.pages is 0 or 1 depending on implementation, but must be a
 *         non-negative integer consistent with records and limit
 *    - Current and limit are non-negative
 *    - The ancestor category id does not appear in the data array (defensive check)
 */
export async function test_api_category_descendants_no_children_returns_empty_array(
  connection: api.IConnection,
) {
  // 1. Join as admin to obtain authenticated admin context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create a single root category with no children
  const createCategoryBody = {
    parent_id: null,
    slug: `e2e-${RandomGenerator.alphaNumeric(12)}`,
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    description_en: RandomGenerator.paragraph({ sentences: 4 }),
    status: "active",
    sort_order: 0 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const createdCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: createCategoryBody,
    });
  typia.assert<IShoppingMallCategory>(createdCategory);

  // 3. Query descendants for the created category
  const page: IPageIShoppingMallCategory.ISummary =
    await api.functional.shoppingMall.categories.descendants.index(connection, {
      categoryId: createdCategory.id,
    });
  typia.assert<IPageIShoppingMallCategory.ISummary>(page);

  const { pagination, data } = page;

  // 4. Validate pagination invariants for empty descendants
  TestValidator.predicate(
    "pagination.current should be non-negative",
    pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination.limit should be non-negative",
    pagination.limit >= 0,
  );
  TestValidator.equals(
    "pagination.records should be zero when no descendants exist",
    pagination.records,
    0,
  );
  TestValidator.predicate(
    "pagination.pages should be non-negative",
    pagination.pages >= 0,
  );

  // 5. data should be an empty array
  TestValidator.equals(
    "descendants data array must be empty when category has no descendants",
    data.length,
    0,
  );

  // 6. Defensive: ensure ancestor id does not appear in descendants list
  const containsAncestor = data.some(
    (category) => category.id === createdCategory.id,
  );
  TestValidator.predicate(
    "descendants list must not contain the ancestor category itself",
    containsAncestor === false,
  );
}
