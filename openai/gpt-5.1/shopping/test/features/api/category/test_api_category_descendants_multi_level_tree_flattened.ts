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
 * Validate that the descendants endpoint returns a flattened subtree for a
 * multi-level category hierarchy.
 *
 * Business context: The shopping mall exposes a read-only public endpoint GET
 * /shoppingMall/categories/{categoryId}/descendants that should return all
 * descendant categories of a given ancestor category, regardless of depth, as a
 * flat paginated list of IShoppingMallCategory.ISummary. The ancestor itself
 * should not be present in the descendants list.
 *
 * This test builds a small category tree under admin privileges and then
 * exercises the public descendants endpoint.
 *
 * Steps:
 *
 * 1. Join as an admin using POST /auth/admin/join to obtain an authenticated admin
 *    context.
 * 2. Create root category A with no parent_id via POST
 *    /shoppingMall/admin/categories.
 * 3. Create child category B whose parent_id is A.id via the same admin categories
 *    create endpoint.
 * 4. Create grandchild categories C1 and C2 whose parent_id is B.id.
 * 5. Call GET /shoppingMall/categories/{categoryId}/descendants with
 *    categoryId=A.id.
 * 6. Assert the response type is IPageIShoppingMallCategory.ISummary with
 *    typia.assert.
 * 7. Assert that the returned data array has exactly 3 elements and that their ids
 *    match B.id, C1.id, and C2.id (order is not important).
 * 8. Assert that none of the returned items has id equal to A.id, confirming that
 *    the ancestor is excluded.
 * 9. Assert that the parent_id relationships in the summaries reflect the
 *    hierarchy:
 *
 *    - The summary corresponding to B has parent_id === A.id.
 *    - The summaries corresponding to C1 and C2 have parent_id === B.id.
 * 10. Optionally, assert that pagination metadata (records, pages) is consistent
 *     with a single page of three records.
 */
export async function test_api_category_descendants_multi_level_tree_flattened(
  connection: api.IConnection,
) {
  // 1. Join as admin to obtain authenticated admin context.
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
  typia.assert(adminAuthorized);

  // 2. Create root category A (no parent_id).
  const categoryABody = {
    parent_id: null,
    slug: RandomGenerator.alphaNumeric(12),
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    description_en: RandomGenerator.paragraph({ sentences: 4 }),
    status: "active",
    sort_order: 1 satisfies number as number,
    is_leaf: false,
  } satisfies IShoppingMallCategory.ICreate;

  const categoryA: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryABody,
    });
  typia.assert(categoryA);

  // 3. Create child category B under A.
  const categoryBBody = {
    parent_id: categoryA.id,
    slug: RandomGenerator.alphaNumeric(12),
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    description_en: RandomGenerator.paragraph({ sentences: 4 }),
    status: "active",
    sort_order: 2 satisfies number as number,
    is_leaf: false,
  } satisfies IShoppingMallCategory.ICreate;

  const categoryB: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryBBody,
    });
  typia.assert(categoryB);

  // 4. Create grandchild categories C1 and C2 under B.
  const categoryC1Body = {
    parent_id: categoryB.id,
    slug: RandomGenerator.alphaNumeric(12),
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    description_en: RandomGenerator.paragraph({ sentences: 4 }),
    status: "active",
    sort_order: 3 satisfies number as number,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const categoryC1: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryC1Body,
    });
  typia.assert(categoryC1);

  const categoryC2Body = {
    parent_id: categoryB.id,
    slug: RandomGenerator.alphaNumeric(12),
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    description_en: RandomGenerator.paragraph({ sentences: 4 }),
    status: "active",
    sort_order: 4 satisfies number as number,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const categoryC2: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryC2Body,
    });
  typia.assert(categoryC2);

  // 5. Call descendants endpoint for ancestor A.
  const descendantsPage: IPageIShoppingMallCategory.ISummary =
    await api.functional.shoppingMall.categories.descendants.index(connection, {
      categoryId: categoryA.id,
    });
  typia.assert(descendantsPage);

  // 6. Basic pagination invariants.
  const pagination: IPage.IPagination = descendantsPage.pagination;
  TestValidator.predicate(
    "pagination current should be non-negative",
    pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit should be non-negative",
    pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records should be non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be non-negative",
    pagination.pages >= 0,
  );

  // 7. Data must contain exactly B, C1, and C2; order is irrelevant.
  const data = descendantsPage.data;
  TestValidator.equals("descendants data length should be 3", data.length, 3);

  const descendantIds = data.map((c) => c.id);
  const expectedIds = [categoryB.id, categoryC1.id, categoryC2.id];

  TestValidator.equals(
    "descendants ids should match B, C1, C2 (unordered)",
    descendantIds.sort(),
    expectedIds.slice().sort(),
  );

  // 8. Ancestor A must not be present in descendants.
  TestValidator.predicate(
    "ancestor category A should not appear in descendants list",
    descendantIds.includes(categoryA.id) === false,
  );

  // 9. Parent-child relationships must be preserved in summaries.
  const summaryB = data.find((c) => c.id === categoryB.id);
  const summaryC1 = data.find((c) => c.id === categoryC1.id);
  const summaryC2 = data.find((c) => c.id === categoryC2.id);

  TestValidator.predicate(
    "summary for B should be present in descendants",
    summaryB !== undefined,
  );
  TestValidator.predicate(
    "summary for C1 should be present in descendants",
    summaryC1 !== undefined,
  );
  TestValidator.predicate(
    "summary for C2 should be present in descendants",
    summaryC2 !== undefined,
  );

  if (summaryB !== undefined) {
    TestValidator.equals(
      "B.parent_id should equal A.id in descendants summary",
      summaryB.parent_id,
      categoryA.id,
    );
  }

  if (summaryC1 !== undefined) {
    TestValidator.equals(
      "C1.parent_id should equal B.id in descendants summary",
      summaryC1.parent_id,
      categoryB.id,
    );
  }

  if (summaryC2 !== undefined) {
    TestValidator.equals(
      "C2.parent_id should equal B.id in descendants summary",
      summaryC2.parent_id,
      categoryB.id,
    );
  }

  // 10. Optional: assert pagination metadata reflects exactly 3 records
  TestValidator.equals(
    "pagination.records should equal number of descendants (3)",
    pagination.records,
    3,
  );
  TestValidator.predicate(
    "pagination.pages should be at least 1 when there are records",
    pagination.pages >= 1,
  );
}
