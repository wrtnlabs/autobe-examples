import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";

export async function test_api_category_ancestors_multi_level_hierarchy_ordering(
  connection: api.IConnection,
) {
  /**
   * Validate multi-level category ancestor resolution and ordering for a deep
   * descendant.
   *
   * Business context:
   *
   * - Shopping mall categories form a hierarchical taxonomy via parent_id.
   * - The public ancestors endpoint should expose the ancestor chain from root
   *   down to the immediate parent of a given category, without including the
   *   category itself.
   *
   * Test steps:
   *
   * 1. Join as an admin using /auth/admin/join to obtain admin authorization.
   * 2. Create root category A (no parent_id) via /shoppingMall/admin/categories.
   * 3. Create child category B with parent_id = A.id.
   * 4. Create grandchild category C with parent_id = B.id.
   * 5. Call GET /shoppingMall/categories/{categoryId}/ancestors for C.id.
   * 6. Assert that the returned value is type-correct
   *    (IShoppingMallCategory.ISummary).
   * 7. Validate that the returned ancestor corresponds to B (immediate parent of
   *    C), and that C itself is not returned.
   *
   * Note: The SDK signature for ancestors.index returns a single
   * IShoppingMallCategory.ISummary rather than an array. Therefore, this test
   * focuses on validating that the API returns the immediate parent in a
   * consistent way, and that the target category C is not included in that
   * summary.
   */

  // 1. Admin join (creates and authenticates an admin actor)
  const adminJoinBody = {
    email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "P@ssw0rd!", // any string is acceptable for password format here
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create root category A
  const categoryARequest = {
    parent_id: null,
    slug: `cat-a-${RandomGenerator.alphaNumeric(6)}`,
    name_en: `Category A ${RandomGenerator.paragraph({ sentences: 1 })}`,
    description_en: RandomGenerator.paragraph({ sentences: 3 }),
    status: "active",
    sort_order: 1,
    is_leaf: false,
  } satisfies IShoppingMallCategory.ICreate;

  const categoryA: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryARequest,
    });
  typia.assert(categoryA);

  // 3. Create child category B under A
  const categoryBRequest = {
    parent_id: categoryA.id,
    slug: `cat-b-${RandomGenerator.alphaNumeric(6)}`,
    name_en: `Category B ${RandomGenerator.paragraph({ sentences: 1 })}`,
    description_en: RandomGenerator.paragraph({ sentences: 3 }),
    status: "active",
    sort_order: 2,
    is_leaf: false,
  } satisfies IShoppingMallCategory.ICreate;

  const categoryB: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryBRequest,
    });
  typia.assert(categoryB);

  // 4. Create grandchild category C under B
  const categoryCRequest = {
    parent_id: categoryB.id,
    slug: `cat-c-${RandomGenerator.alphaNumeric(6)}`,
    name_en: `Category C ${RandomGenerator.paragraph({ sentences: 1 })}`,
    description_en: RandomGenerator.paragraph({ sentences: 3 }),
    status: "active",
    sort_order: 3,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const categoryC: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryCRequest,
    });
  typia.assert(categoryC);

  TestValidator.equals(
    "C's parent_id should reference B.id",
    categoryC.parent_id,
    categoryB.id,
  );

  // 5. Call ancestors endpoint for C.id
  const ancestorSummary: IShoppingMallCategory.ISummary =
    await api.functional.shoppingMall.categories.ancestors.index(connection, {
      categoryId: categoryC.id,
    });
  typia.assert(ancestorSummary);

  // 6. Validate that the ancestor is B and not C
  TestValidator.equals(
    "ancestor for C should be its immediate parent B",
    ancestorSummary.id,
    categoryB.id,
  );
  TestValidator.equals(
    "ancestor slug should match B.slug",
    ancestorSummary.slug,
    categoryB.slug,
  );
  TestValidator.equals(
    "ancestor name_en should match B.name_en",
    ancestorSummary.name_en,
    categoryB.name_en,
  );
  TestValidator.equals(
    "ancestor parent_id should match A.id",
    ancestorSummary.parent_id,
    categoryA.id,
  );

  TestValidator.notEquals(
    "ancestor must not be the category C itself",
    ancestorSummary.id,
    categoryC.id,
  );
}
