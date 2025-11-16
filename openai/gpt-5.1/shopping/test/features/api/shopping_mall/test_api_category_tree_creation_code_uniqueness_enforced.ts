import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCategoryTree } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategoryTree";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Verify that creating a category tree enforces global uniqueness of the `code`
 * field.
 *
 * Business context:
 *
 * - Platform admins manage catalog category trees in the shopping mall backend.
 * - Each category tree is identified by a stable business `code` that must be
 *   unique across all trees.
 * - Attempting to create a second tree with the same `code` should fail and not
 *   create another record.
 *
 * Scenario steps:
 *
 * 1. Join as a platform admin using POST /auth/platformAdmin/join to obtain an
 *    authenticated session (SDK will attach the access token to the
 *    connection).
 * 2. Create a first category tree via POST
 *    /shoppingMall/platformAdmin/categoryTrees with a fixed business `code`
 *    (e.g., "DUPLICATE-TREE").
 * 3. Assert that the first creation succeeds and returns a valid
 *    IShoppingMallCategoryTree with the correct `code`.
 * 4. Attempt to create a second category tree using the same `code` but with
 *    different `name` or `description`.
 * 5. Assert that the second creation attempt fails using TestValidator.error,
 *    indicating the uniqueness rule is enforced.
 * 6. Ensure the original tree object remains unchanged in memory and still
 *    reflects the requested `code`.
 */
export async function test_api_category_tree_creation_code_uniqueness_enforced(
  connection: api.IConnection,
) {
  // 1. Join as a platform admin to obtain an authorized session
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin = await api.functional.auth.platformAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 2. Create the first category tree with a fixed business code
  const duplicateCode = "DUPLICATE-TREE";

  const firstCreateBody = {
    code: duplicateCode,
    name: "Primary Duplicate Test Tree",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;

  const firstTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      {
        body: firstCreateBody,
      },
    );
  typia.assert<IShoppingMallCategoryTree>(firstTree);

  // Basic invariants for the first tree
  TestValidator.equals(
    "first tree code should match requested code",
    firstTree.code,
    duplicateCode,
  );
  TestValidator.predicate(
    "first tree id should be a non-empty string",
    firstTree.id.length > 0,
  );

  // 3. Attempt to create a second category tree with the same code
  const secondCreateBody = {
    code: duplicateCode,
    name: "Secondary Duplicate Test Tree",
    description: RandomGenerator.paragraph({ sentences: 2 }),
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;

  await TestValidator.error(
    "duplicate category tree code should be rejected",
    async () => {
      await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
        connection,
        {
          body: secondCreateBody,
        },
      );
    },
  );

  // 4. Ensure the original tree object remains intact (in-memory consistency)
  TestValidator.equals(
    "original tree still retains the duplicate test code",
    firstTree.code,
    duplicateCode,
  );
}
