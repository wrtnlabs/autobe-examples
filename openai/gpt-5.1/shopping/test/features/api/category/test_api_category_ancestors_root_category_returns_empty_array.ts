import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";

/**
 * Validate ancestor lookup behavior for a root category.
 *
 * Business rules:
 *
 * - Categories are organized in a tree via parent_id.
 * - Ancestors endpoint is public and should work without authentication.
 * - For a root category (parent_id = null), the ancestor chain is empty according
 *   to the original requirements, but the current SDK models the response type
 *   as a single `IShoppingMallCategory.ISummary`, not an array.
 *
 * Because test code must honor the compiled SDK types, this test focuses on the
 * behaviors that are representable with the given contracts:
 *
 * 1. Bootstrap an admin account via POST /auth/admin/join so that we can create
 *    catalog categories.
 * 2. As that admin, create a root category via POST /shoppingMall/admin/categories
 *    with parent_id = null.
 * 3. Call GET /shoppingMall/categories/{categoryId}/ancestors without
 *    authentication using a cloned, header-less connection to reflect the
 *    public nature of the endpoint.
 * 4. Assert that:
 *
 *    - The created category is a root (parent_id is null).
 *    - The ancestors endpoint call succeeds for a root category and returns a value
 *         of type IShoppingMallCategory.ISummary as declared by SDK.
 *
 * Note: The original natural language scenario additionally required "response
 * body is an empty array" and explicit HTTP 200 verification. Those
 * expectations cannot be expressed without contradicting the generated SDK
 * signature (non-array response) or the fetch abstraction (which throws instead
 * of exposing raw status). Therefore they are intentionally omitted to keep
 * this e2e test type-safe and compilable.
 */
export async function test_api_category_ancestors_root_category_returns_empty_array(
  connection: api.IConnection,
) {
  // 1. Create an admin (join) to obtain admin context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    // ip is optional and may be null; we can let the backend derive it
    ip: null,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create a root category (parent_id explicitly null)
  const rootCategoryCreate = {
    parent_id: null,
    slug: `root-${RandomGenerator.alphaNumeric(8)}`,
    name_en: RandomGenerator.name(2),
    description_en: RandomGenerator.paragraph({ sentences: 4 }),
    status: "active",
    sort_order: 1 satisfies number as number,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const rootCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: rootCategoryCreate,
    });
  typia.assert<IShoppingMallCategory>(rootCategory);

  // Ensure the created category is indeed a root node
  TestValidator.equals(
    "created category must be root (parent_id null)",
    rootCategory.parent_id ?? null,
    null,
  );

  // 3. Call ancestors endpoint without authentication
  const anonymousConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  const ancestorsSummary =
    await api.functional.shoppingMall.categories.ancestors.index(
      anonymousConnection,
      {
        categoryId: rootCategory.id,
      },
    );
  typia.assert<IShoppingMallCategory.ISummary>(ancestorsSummary);

  // We cannot assert "empty array" due to non-array response type, but we
  // can at least assert that a valid summary object is returned for a root
  // category without raising errors.
  TestValidator.predicate(
    "ancestors endpoint returns a summary object for root category without error",
    () => ancestorsSummary.id !== undefined && ancestorsSummary.slug.length > 0,
  );
}
