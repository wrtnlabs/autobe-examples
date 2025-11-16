import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Verify that category creation is rejected when targeting a non-existent
 * category tree code.
 *
 * Business intent:
 *
 * - Platform admins may create catalog categories only within existing category
 *   trees.
 * - If a client attempts to create a category for a tree code that does not
 *   exist, the backend must enforce referential integrity and reject the
 *   request with an HTTP error (4xx class).
 *
 * What this test covers:
 *
 * 1. Registers a platform admin via POST /auth/platformAdmin/join using
 *    `api.functional.auth.platformAdmin.join`, letting the SDK attach the
 *    issued access token onto the shared `connection` automatically.
 * 2. Builds a syntactically and semantically valid `IShoppingMallCategory.ICreate`
 *    payload using random but realistic values.
 * 3. Invokes POST
 *    /shoppingMall/platformAdmin/categoryTrees/{categoryTreeCode}/categories
 *    through
 *    `api.functional.shoppingMall.platformAdmin.categoryTrees.categories.create`
 *    with an intentionally non-existent `categoryTreeCode` (e.g.
 *    "UNKNOWN_TREE").
 * 4. Uses `TestValidator.httpError` to assert that the call fails with a client
 *    error status (any 4xx), demonstrating that the server is validating the
 *    existence of the referenced category tree.
 *
 * Note:
 *
 * - The optional positive-path scenario from the high-level plan (creating an
 *   actual category tree and then a category under it) cannot be implemented
 *   here because no category-tree-creation or listing API is provided in the
 *   current SDK surface. This test therefore focuses solely on the
 *   non-existent-tree failure behavior.
 */
export async function test_api_category_creation_requires_existing_tree(
  connection: api.IConnection,
) {
  // 1. Register a platform admin so that subsequent calls use an
  //    authenticated platformAdmin session. The join endpoint also attaches
  //    the issued access token into `connection.headers` internally.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin = await api.functional.auth.platformAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert(admin);

  // 2. Prepare a valid category creation payload. All fields adhere to the
  //    IShoppingMallCategory.ICreate schema so that any error we observe is
  //    attributable to the missing tree rather than bad input.
  const categoryBody = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    displayOrder: typia.random<number & tags.Type<"int32">>(),
    isActive: true,
    parentCategoryCode: undefined,
  } satisfies IShoppingMallCategory.ICreate;

  // 3. Attempt to create a category under an obviously invalid tree code.
  const invalidTreeCode = "UNKNOWN_TREE";

  await TestValidator.httpError(
    "category creation must fail for unknown tree code",
    [400, 404, 422],
    async () => {
      await api.functional.shoppingMall.platformAdmin.categoryTrees.categories.create(
        connection,
        {
          categoryTreeCode: invalidTreeCode,
          body: categoryBody,
        },
      );
    },
  );
}
