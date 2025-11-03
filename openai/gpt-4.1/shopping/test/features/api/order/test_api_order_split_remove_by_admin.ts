import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";

/**
 * Validates soft-deletion of split portions of orders by an admin.
 *
 * 1. Authenticate as a new admin account.
 * 2. Attempt to soft-delete (archive) an order split with random orderCode and
 *    splitCode (simulate eligible case).
 * 3. Attempt to soft-delete the same split again (should be denied—already
 *    deleted).
 * 4. Attempt to delete a totally non-existent split (should fail as non-existent).
 * 5. Attempt deletion as a non-admin (simulate by resetting connection headers)
 *    and verify access is denied.
 *
 * Business rules, composite uniqueness, and audit trace are considered by
 * checking error behaviors and only using allowed API.
 */
export async function test_api_order_split_remove_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin registration and authentication
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    role: RandomGenerator.pick(["super", "support", "operator"] as const),
    status: "active",
  } satisfies IShoppingAdmin.IJoin;
  const admin: IShoppingAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: joinBody });
  typia.assert(admin);

  // 2. Attempt soft-delete (archive) on simulated order split by admin (random codes, eligibility cannot be truly verified without create API)
  const orderCode = RandomGenerator.alphaNumeric(10);
  const splitCode = RandomGenerator.alphaNumeric(8);
  await api.functional.shopping.admin.orders.splits.erase(connection, {
    orderCode,
    splitCode,
  });

  // 3. Attempt to delete the same split again (simulate already deleted logic; should throw)
  await TestValidator.error(
    "deleting already deleted order split should fail",
    async () => {
      await api.functional.shopping.admin.orders.splits.erase(connection, {
        orderCode,
        splitCode,
      });
    },
  );

  // 4. Attempt to delete a totally non-existent split (random unused codes)
  const nonExistentOrderCode = RandomGenerator.alphaNumeric(10);
  const nonExistentSplitCode = RandomGenerator.alphaNumeric(8);
  await TestValidator.error(
    "deleting non-existent order split should fail",
    async () => {
      await api.functional.shopping.admin.orders.splits.erase(connection, {
        orderCode: nonExistentOrderCode,
        splitCode: nonExistentSplitCode,
      });
    },
  );

  // 5. Attempt deletion as non-admin (simulate unauth with fresh connection headers: forbidden)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "non-admin actor should be denied split deletion",
    async () => {
      await api.functional.shopping.admin.orders.splits.erase(unauthConn, {
        orderCode,
        splitCode,
      });
    },
  );
}
