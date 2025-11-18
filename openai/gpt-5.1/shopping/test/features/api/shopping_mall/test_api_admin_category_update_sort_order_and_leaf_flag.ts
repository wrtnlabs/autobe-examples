import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";

/**
 * Validate admin category update of sort_order and is_leaf flags.
 *
 * Business context: Admins manage a global shopping mall taxonomy. For good UX
 * and SEO, they must be able to reorder categories and toggle whether a
 * category is treated as a leaf node (typically a direct product-bearing node)
 * without corrupting identity fields such as id, slug, and parent linkage.
 *
 * This E2E test exercises that an authenticated admin can:
 *
 * 1. Create a parent category P.
 * 2. Create a child category C under P with initial sort_order and is_leaf.
 * 3. Update C via the admin update endpoint to change sort_order and is_leaf.
 * 4. Observe in the response that identity fields are preserved while sort_order
 *    and is_leaf reflect the requested changes.
 * 5. Optionally apply a second update to simulate drag-and-drop style reordering
 *    and repeated leaf-flag adjustments.
 *
 * Step-by-step scenario:
 *
 * 1. Register a new admin via POST /auth/admin/join
 *    (api.functional.auth.admin.join) using a valid
 *    IShoppingMallAdminJoin.ICreate payload, and assert the
 *    IShoppingMallAdmin.IAuthorized response.
 * 2. As this admin, create a root parent category P via POST
 *    /shoppingMall/admin/categories using IShoppingMallCategory.ICreate where:
 *
 *    - Parent_id is null
 *    - Sort_order is an int32 (e.g. 0)
 *    - Is_leaf is false (structural category).
 * 3. Create a child category C under P with another IShoppingMallCategory.ICreate
 *    payload where:
 *
 *    - Parent_id = P.id
 *    - Sort_order = 10 (explicit larger order index)
 *    - Is_leaf = true (leaf category).
 * 4. Call PUT /shoppingMall/admin/categories/{categoryId} using
 *    api.functional.shoppingMall.admin.categories.update for C, with body
 *    satisfying IShoppingMallCategory.IUpdate and containing only:
 *
 *    - Sort_order: 1 (move C before others)
 *    - Is_leaf: false (convert into structural category).
 * 5. Validate that the returned IShoppingMallCategory:
 *
 *    - Has the same id as C.
 *    - Has the same slug as C.
 *    - Has the same parent_id as C (still child of P).
 *    - Has sort_order === 1.
 *    - Has is_leaf === false.
 * 6. Perform a second update on the same category C with a new body
 *    IShoppingMallCategory.IUpdate where:
 *
 *    - Sort_order: 5
 *    - Is_leaf: true and validate again that identity fields are preserved and the
 *         new values are reflected.
 * 7. Additionally, assert via TestValidator.predicate that:
 *
 *    - Parent category has parent_id === null.
 *    - Child category always has non-null parent_id equal to P.id.
 */
export async function test_api_admin_category_update_sort_order_and_leaf_flag(
  connection: api.IConnection,
) {
  // 1. Register a new admin and establish authenticated context.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    // For href and referrer, we can use well-formed URIs.
    href: "https://admin.shoppingmall.local/join",
    referrer: "https://admin.shoppingmall.local/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a parent category P as a root node (parent_id null, non-leaf).
  const parentCategoryCreateBody = {
    parent_id: null,
    slug: `parent-${RandomGenerator.alphaNumeric(8)}`,
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    description_en: RandomGenerator.paragraph({ sentences: 4 }),
    status: "active",
    sort_order: 0 as number & tags.Type<"int32">,
    is_leaf: false,
  } satisfies IShoppingMallCategory.ICreate;

  const parentCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: parentCategoryCreateBody,
    });
  typia.assert(parentCategory);

  TestValidator.equals(
    "parent category should have null parent_id (root)",
    parentCategory.parent_id,
    null,
  );

  // 3. Create a child category C under P with explicit sort_order and is_leaf.
  const childInitialSortOrder: number & tags.Type<"int32"> = 10 as number &
    tags.Type<"int32">;

  const childCategoryCreateBody = {
    parent_id: parentCategory.id,
    slug: `child-${RandomGenerator.alphaNumeric(8)}`,
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    description_en: RandomGenerator.paragraph({ sentences: 3 }),
    status: "active",
    sort_order: childInitialSortOrder,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const childCategoryInitial: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: childCategoryCreateBody,
    });
  typia.assert(childCategoryInitial);

  TestValidator.equals(
    "child category should have parent_id equal to parent.id",
    childCategoryInitial.parent_id,
    parentCategory.id,
  );
  TestValidator.equals(
    "child initial sort_order should match request",
    childCategoryInitial.sort_order,
    childInitialSortOrder,
  );
  TestValidator.equals(
    "child initial is_leaf should be true",
    childCategoryInitial.is_leaf,
    true,
  );

  // 4. First update: change sort_order to 1 and is_leaf to false.
  const firstUpdatedSortOrder: number & tags.Type<"int32"> = 1 as number &
    tags.Type<"int32">;

  const firstUpdateBody = {
    sort_order: firstUpdatedSortOrder,
    is_leaf: false,
  } satisfies IShoppingMallCategory.IUpdate;

  const childCategoryUpdated1: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.update(connection, {
      categoryId: childCategoryInitial.id,
      body: firstUpdateBody,
    });
  typia.assert(childCategoryUpdated1);

  // 5. Validate that identity fields are unchanged and fields are updated.
  TestValidator.equals(
    "first update: child id must remain the same",
    childCategoryUpdated1.id,
    childCategoryInitial.id,
  );
  TestValidator.equals(
    "first update: child slug must remain the same",
    childCategoryUpdated1.slug,
    childCategoryInitial.slug,
  );
  TestValidator.equals(
    "first update: child parent_id must remain the same",
    childCategoryUpdated1.parent_id,
    childCategoryInitial.parent_id,
  );
  TestValidator.equals(
    "first update: sort_order must be updated to 1",
    childCategoryUpdated1.sort_order,
    firstUpdatedSortOrder,
  );
  TestValidator.equals(
    "first update: is_leaf must be updated to false",
    childCategoryUpdated1.is_leaf,
    false,
  );

  await TestValidator.predicate(
    "sort_order should be non-negative for parent and child",
    async () =>
      parentCategory.sort_order >= 0 && childCategoryUpdated1.sort_order >= 0,
  );

  // 6. Second update: change sort_order again and flip is_leaf back to true.
  const secondUpdatedSortOrder: number & tags.Type<"int32"> = 5 as number &
    tags.Type<"int32">;

  const secondUpdateBody = {
    sort_order: secondUpdatedSortOrder,
    is_leaf: true,
  } satisfies IShoppingMallCategory.IUpdate;

  const childCategoryUpdated2: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.update(connection, {
      categoryId: childCategoryInitial.id,
      body: secondUpdateBody,
    });
  typia.assert(childCategoryUpdated2);

  TestValidator.equals(
    "second update: child id must still remain the same",
    childCategoryUpdated2.id,
    childCategoryInitial.id,
  );
  TestValidator.equals(
    "second update: child slug must still remain the same",
    childCategoryUpdated2.slug,
    childCategoryInitial.slug,
  );
  TestValidator.equals(
    "second update: child parent_id must still remain the same",
    childCategoryUpdated2.parent_id,
    childCategoryInitial.parent_id,
  );
  TestValidator.equals(
    "second update: sort_order must be updated to 5",
    childCategoryUpdated2.sort_order,
    secondUpdatedSortOrder,
  );
  TestValidator.equals(
    "second update: is_leaf must be updated back to true",
    childCategoryUpdated2.is_leaf,
    true,
  );

  await TestValidator.predicate(
    "child should always remain under the same parent and parent must be root",
    async () =>
      parentCategory.parent_id === null &&
      childCategoryUpdated2.parent_id === parentCategory.id,
  );
}
