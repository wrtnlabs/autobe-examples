import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";

/**
 * Verify public retrieval of child categories for a root category.
 *
 * Business goal:
 *
 * - Ensure that the children listing endpoint for categories is publicly
 *   accessible (does not require authentication).
 * - Use an admin-only flow only for data setup (creating the parent category),
 *   then switch to an unauthenticated connection for the actual target call.
 *
 * High level steps:
 *
 * 1. Join an admin using POST /auth/admin/join to obtain an authorized admin
 *    context on the shared connection.
 * 2. As the admin, create a new root category (parent_id null/undefined) using
 *    POST /shoppingMall/admin/categories.
 * 3. Derive a new, unauthenticated connection from the shared connection by
 *    cloning it and overriding headers to an empty object.
 * 4. Call GET /shoppingMall/categories/{categoryId}/children against the created
 *    category using the unauthenticated connection.
 * 5. Assert that the call succeeds without authentication and that the response
 *    structurally matches IShoppingMallCategory.ISummary.
 *
 * Note:
 *
 * - Although the narrative scenario mentions an array response and empty list
 *   semantics for parents without children, the concrete SDK type for this
 *   endpoint is a single IShoppingMallCategory.ISummary. To remain type-correct
 *   and compilable, this test focuses on public accessibility and structural
 *   validity of the response instead of empty-array behavior.
 */
export async function test_api_category_children_public_retrieval_for_root_category(
  connection: api.IConnection,
) {
  // 1. Admin join to obtain an authorized admin context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: null,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a new root category (no parent)
  const createCategoryBody = {
    parent_id: null,
    slug: RandomGenerator.alphaNumeric(12),
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    description_en: RandomGenerator.paragraph({ sentences: 4 }),
    status: "active",
    sort_order: 0,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const rootCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: createCategoryBody,
    });
  typia.assert(rootCategory);

  TestValidator.predicate(
    "created category should be root (parent_id is null)",
    rootCategory.parent_id === null,
  );

  // 3. Prepare an unauthenticated public connection (no Authorization)
  const publicConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 4. Publicly call children endpoint for the created category
  const childSummary: IShoppingMallCategory.ISummary =
    await api.functional.shoppingMall.categories.children.index(
      publicConnection,
      { categoryId: rootCategory.id },
    );
  typia.assert(childSummary);

  // 5. Basic sanity checks on the returned summary
  TestValidator.predicate(
    "children endpoint returns some category summary for given parent",
    typeof childSummary.id === "string" && childSummary.id.length > 0,
  );
}
