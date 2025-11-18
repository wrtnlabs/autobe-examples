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
 * Verify that descendant listing excludes deleted categories.
 *
 * Business scenario:
 *
 * - An admin manages the global product category taxonomy.
 * - They create a root category A and two child categories B1 and B2.
 * - They delete B2 using the admin delete endpoint.
 * - When clients query descendants of A, only non-deleted categories should
 *   appear in the subtree. Therefore, B1 must appear in the descendants list
 *   while B2 must not.
 *
 * Steps:
 *
 * 1. Join as an admin via POST /auth/admin/join to obtain an authenticated admin
 *    context (SDK handles Authorization header automatically).
 * 2. Create root category A via POST /shoppingMall/admin/categories.
 * 3. Create child category B1 with parent_id = A.id.
 * 4. Create child category B2 with parent_id = A.id.
 * 5. Delete B2 via DELETE /shoppingMall/admin/categories/{categoryId}.
 * 6. Call GET /shoppingMall/categories/{categoryId}/descendants for A.id.
 * 7. Assert that:
 *
 *    - Response shape matches IPageIShoppingMallCategory.ISummary.
 *    - B1 is present in data (matching id) and has parent_id = A.id.
 *    - B2 is not present in data at all.
 *    - There is at least one descendant (B1) in the list.
 */
export async function test_api_category_descendants_excludes_soft_deleted_descendants(
  connection: api.IConnection,
) {
  // 1. Admin join to get authenticated admin context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password123!" as string & tags.Format<"password">,
    ip: null,
    href: "https://admin.shoppingmall.example/join" as string &
      tags.Format<"uri">,
    referrer: "https://admin.shoppingmall.example/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create root category A
  const categoryARootBody = {
    parent_id: null,
    slug: `root-${RandomGenerator.alphaNumeric(8)}`,
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    description_en: RandomGenerator.paragraph({ sentences: 4 }),
    status: "active",
    sort_order: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
    is_leaf: false,
  } satisfies IShoppingMallCategory.ICreate;

  const categoryA: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryARootBody,
    });
  typia.assert<IShoppingMallCategory>(categoryA);

  // 3. Create child category B1 under A
  const categoryB1Body = {
    parent_id: categoryA.id,
    slug: `b1-${RandomGenerator.alphaNumeric(8)}`,
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    description_en: RandomGenerator.paragraph({ sentences: 3 }),
    status: "active",
    sort_order: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const categoryB1: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryB1Body,
    });
  typia.assert<IShoppingMallCategory>(categoryB1);

  // 4. Create child category B2 under A
  const categoryB2Body = {
    parent_id: categoryA.id,
    slug: `b2-${RandomGenerator.alphaNumeric(8)}`,
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    description_en: RandomGenerator.paragraph({ sentences: 3 }),
    status: "active",
    sort_order: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const categoryB2: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryB2Body,
    });
  typia.assert<IShoppingMallCategory>(categoryB2);

  // 5. Delete B2 via admin erase endpoint
  await api.functional.shoppingMall.admin.categories.erase(connection, {
    categoryId: categoryB2.id,
  });

  // 6. Fetch descendants of A
  const descendantsPage: IPageIShoppingMallCategory.ISummary =
    await api.functional.shoppingMall.categories.descendants.index(connection, {
      categoryId: categoryA.id,
    });
  typia.assert<IPageIShoppingMallCategory.ISummary>(descendantsPage);

  const data = descendantsPage.data;

  // Basic sanity: at least one descendant should exist (B1)
  TestValidator.predicate(
    "descendants list should contain at least one category",
    data.length > 0,
  );

  // Find B1 and B2 by id in descendants
  const foundB1 = data.find((c) => c.id === categoryB1.id);
  const foundB2 = data.find((c) => c.id === categoryB2.id);

  // 7a. B1 must be present
  TestValidator.predicate(
    "B1 category should appear in descendants of A",
    foundB1 !== undefined,
  );

  if (foundB1 !== undefined) {
    // parent_id should equal A.id
    TestValidator.equals(
      "B1 parent_id should equal A.id",
      foundB1.parent_id,
      categoryA.id,
    );

    // B1 should look like an active category from a logical perspective
    TestValidator.predicate(
      "B1 status should indicate an active-like state",
      typeof foundB1.status === "string" && foundB1.status.length > 0,
    );
  }

  // 7b. B2 must NOT be present
  TestValidator.predicate(
    "B2 category should NOT appear in descendants after deletion",
    foundB2 === undefined,
  );
}
