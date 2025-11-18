import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";

/**
 * Validate last-write-wins behavior for successive admin category updates.
 *
 * Business goal
 *
 * - Ensure that when an admin performs two immediate PUT
 *   /shoppingMall/admin/categories/{categoryId} updates without any explicit
 *   versioning or concurrency token, the backend behaves in a deterministic
 *   last-write-wins manner for overlapping fields.
 * - Confirm that fields only updated in the first request remain preserved when
 *   the second request does not touch them.
 *
 * Scenario steps
 *
 * 1. Join as an admin using POST /auth/admin/join (this sets Authorization header
 *    on the connection).
 * 2. Create a baseline category via POST /shoppingMall/admin/categories.
 * 3. Prepare Update1 (changes name_en and sort_order) and apply it with PUT
 *    /shoppingMall/admin/categories/{categoryId}.
 * 4. Validate that Update1’s values are reflected and unchanged fields (slug,
 *    is_leaf, status, parent_id) still match the original.
 * 5. Prepare Update2 (changes name_en to a different value and description_en, but
 *    does not include sort_order) and apply it with the same PUT.
 * 6. Validate that:
 *
 *    - Overlapping fields (name_en, description_en) now reflect Update2.
 *    - Non-overlapping field from Update1 (sort_order) is preserved.
 *    - Fields never updated in either request (slug, is_leaf, status, parent_id)
 *         still match the original category.
 */
export async function test_api_admin_category_update_concurrent_edits_last_write_wins(
  connection: api.IConnection,
) {
  // 1. Join as an admin
  const adminJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const authorizedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(authorizedAdmin);

  // 2. Create a baseline category
  const createBody = {
    parent_id: null,
    slug: RandomGenerator.alphabets(10),
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    description_en: RandomGenerator.paragraph({ sentences: 4 }),
    status: "active",
    sort_order: typia.random<number & tags.Type<"int32">>(),
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const original: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: createBody,
    });
  typia.assert(original);

  // 3. Prepare Update1 and apply it
  const nameUpdate1 = RandomGenerator.paragraph({ sentences: 1 });
  const sortOrderUpdate1 = typia.random<number & tags.Type<"int32">>();

  const updateBody1 = {
    name_en: nameUpdate1,
    sort_order: sortOrderUpdate1,
  } satisfies IShoppingMallCategory.IUpdate;

  const afterFirst: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.update(connection, {
      categoryId: original.id,
      body: updateBody1,
    });
  typia.assert(afterFirst);

  // Validate first update effect
  TestValidator.equals(
    "first update should change name_en",
    afterFirst.name_en,
    nameUpdate1,
  );
  TestValidator.equals(
    "first update should change sort_order",
    afterFirst.sort_order,
    sortOrderUpdate1,
  );
  TestValidator.equals(
    "slug should remain from original after first update",
    afterFirst.slug,
    original.slug,
  );
  TestValidator.equals(
    "status should remain from original after first update",
    afterFirst.status,
    original.status,
  );
  TestValidator.equals(
    "is_leaf should remain from original after first update",
    afterFirst.is_leaf,
    original.is_leaf,
  );
  TestValidator.equals(
    "parent_id should remain from original after first update",
    afterFirst.parent_id ?? null,
    original.parent_id ?? null,
  );

  // 4. Prepare Update2 and apply it (last write)
  const nameUpdate2 = RandomGenerator.paragraph({ sentences: 1 });
  const descriptionUpdate2 = RandomGenerator.paragraph({ sentences: 3 });

  const updateBody2 = {
    name_en: nameUpdate2,
    description_en: descriptionUpdate2,
  } satisfies IShoppingMallCategory.IUpdate;

  const afterSecond: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.update(connection, {
      categoryId: original.id,
      body: updateBody2,
    });
  typia.assert(afterSecond);

  // 5. Last-write-wins assertions
  // Overlapping fields: name_en should now reflect Update2, not Update1
  TestValidator.equals(
    "second update should win for name_en",
    afterSecond.name_en,
    nameUpdate2,
  );
  TestValidator.notEquals(
    "second update name_en should differ from first update",
    afterSecond.name_en,
    nameUpdate1,
  );

  // description_en should now come from Update2
  TestValidator.equals(
    "second update should set description_en",
    afterSecond.description_en,
    descriptionUpdate2,
  );

  // Non-overlapping field from Update1: sort_order must be preserved
  TestValidator.equals(
    "sort_order from first update should be preserved after second update",
    afterSecond.sort_order,
    sortOrderUpdate1,
  );

  // Fields never modified in any update should remain as in original
  TestValidator.equals(
    "slug should remain from original after second update",
    afterSecond.slug,
    original.slug,
  );
  TestValidator.equals(
    "status should remain from original after second update",
    afterSecond.status,
    original.status,
  );
  TestValidator.equals(
    "is_leaf should remain from original after second update",
    afterSecond.is_leaf,
    original.is_leaf,
  );
  TestValidator.equals(
    "parent_id should remain from original after second update",
    afterSecond.parent_id ?? null,
    original.parent_id ?? null,
  );
}
