import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCategoryTree } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategoryTree";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Create a category tree in an inactive state for later configuration.
 *
 * Business goal: Ensure a platform admin can create a new category tree
 * configuration that is initially inactive (active=false), so it can be
 * prepared and reviewed before being exposed for catalog usage. The backend
 * must respect the requested active flag and not force new trees to
 * active=true.
 *
 * Steps:
 *
 * 1. Register a platform administrator via /auth/platformAdmin/join to obtain an
 *    authenticated admin session (token handling is done automatically by the
 *    SDK).
 * 2. As that admin, call POST /shoppingMall/platformAdmin/categoryTrees with a
 *    well-formed IShoppingMallCategoryTree.ICreate payload that:
 *
 *    - Uses a unique business code for the tree (e.g., "STAGING-TREE-<rand>").
 *    - Provides a descriptive name like "Staging Category Tree".
 *    - Provides a description clarifying that this is a staging/test tree.
 *    - Explicitly sets active to false.
 *    - Sets defaultLocale to a realistic locale string such as "en-US".
 * 3. Assert the response is a valid IShoppingMallCategoryTree via typia.assert.
 * 4. Validate key business behaviors using TestValidator:
 *
 *    - Active in the response is exactly false.
 *    - Code, name, description, and defaultLocale in the response match what was
 *         sent in the request.
 *    - CreatedAt and updatedAt exist as ISO 8601 date-time strings (typia.assert
 *         already guarantees type/format, so just rely on that).
 */
export async function test_api_category_tree_creation_with_inactive_flag(
  connection: api.IConnection,
) {
  // 1. Join as a platform admin to get an authorized admin session.
  const joinBody = {
    email: `platform-admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 2. Prepare a category tree creation payload with active=false.
  const treeCode = `STAGING-TREE-${RandomGenerator.alphaNumeric(8)}`;
  const createBody = {
    code: treeCode,
    name: "Staging Category Tree",
    description: RandomGenerator.paragraph({
      sentences: 6,
      wordMin: 3,
      wordMax: 10,
    }),
    active: false,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;

  const createdTree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert<IShoppingMallCategoryTree>(createdTree);

  // 3. Business validations.
  TestValidator.predicate(
    "created category tree must be inactive",
    createdTree.active === false,
  );

  TestValidator.equals(
    "category tree code should match request payload",
    createdTree.code,
    createBody.code,
  );

  TestValidator.equals(
    "category tree name should match request payload",
    createdTree.name,
    createBody.name,
  );

  TestValidator.equals(
    "category tree description should match request payload",
    createdTree.description,
    createBody.description,
  );

  TestValidator.equals(
    "category tree defaultLocale should match request payload",
    createdTree.defaultLocale,
    createBody.defaultLocale,
  );

  // createdAt and updatedAt presence and format are already ensured by
  // typia.assert, so no additional per-field validation is necessary.
}
