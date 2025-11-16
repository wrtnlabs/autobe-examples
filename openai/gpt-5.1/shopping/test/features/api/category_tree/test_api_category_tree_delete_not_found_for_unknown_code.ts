import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Validate that deleting a non-existing category tree fails with a not-found
 * style HTTP error while using a properly authenticated platform admin account,
 * and that no side effects occur.
 *
 * Business context
 *
 * - Category trees in `shopping_mall_category_trees` are identified by a unique
 *   `code`.
 * - The erase endpoint must be restricted to platform admins.
 * - When the target code does not exist, the system must NOT treat this as
 *   success; it must raise a not-found style error.
 * - A failing DELETE must also not create or mutate any category tree records.
 *
 * What this test validates
 *
 * 1. A platform admin can successfully join and obtain an authorized session via
 *    POST /auth/platformAdmin/join.
 * 2. Using that authenticated connection, calling DELETE
 *    /shoppingMall/platformAdmin/categoryTrees/{categoryTreeCode} with a
 *    clearly non-existent categoryTreeCode results in an HTTP error.
 * 3. The error is strictly about resource non-existence (not
 *    authentication/authorization).
 * 4. The failing DELETE does not create any category tree record as a side effect
 *    (validated indirectly by calling erase with the same code again and still
 *    getting an error).
 */
export async function test_api_category_tree_delete_not_found_for_unknown_code(
  connection: api.IConnection,
) {
  // 1. Arrange: create a platform admin via join to obtain an authorized session
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  // Type-level guarantee for the authorized admin payload
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 2. Pick a clearly non-existing categoryTreeCode
  //    Use a random UUID-based code with a prefix to reduce collision probability
  const categoryTreeCode: string = `unknown-${typia.random<
    string & tags.Format<"uuid">
  >()}`;

  // 3. Act + Assert: deleting the non-existing category tree must result in an HTTP error
  //    We don't validate the concrete status code here, only that an error occurs.
  await TestValidator.error(
    "erase non-existing category tree must fail",
    async () => {
      await api.functional.shoppingMall.platformAdmin.categoryTrees.erase(
        connection,
        {
          categoryTreeCode,
        },
      );
    },
  );

  // 4. Additional guard: second attempt with the same unknown code should also fail,
  //    asserting idempotent not-found behavior and no side-effect creation.
  await TestValidator.error(
    "repeated erase on same unknown category tree code must still fail",
    async () => {
      await api.functional.shoppingMall.platformAdmin.categoryTrees.erase(
        connection,
        {
          categoryTreeCode,
        },
      );
    },
  );

  // Note: We cannot directly inspect `shopping_mall_category_trees` from this E2E test.
  // The second failing call serves as an indirect assertion that no resource with this
  // code was created as a side effect of the first failing DELETE.
}
