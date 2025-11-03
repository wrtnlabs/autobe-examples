import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";

/**
 * Validate that a system administrator can permanently remove an admin
 * suspension record (hard delete) by ID.
 *
 * 1. Register and authenticate a new admin (with sufficient privilege).
 * 2. Attempt to delete an (assumed existing) admin suspension record using a valid
 *    random UUID.
 *
 *    - Confirm the API call does not fail (void response is success).
 * 3. Try deleting a non-existent admin suspension record (another random UUID).
 *    Expect an error.
 * 4. Remove admin's authentication (simulate unauthorized actor), and try deleting
 *    any UUID. Expect an error.
 * 5. Attempt to delete a reserved/protected UUID (simulate protected suspension).
 *    Expect an error.
 */
export async function test_api_admin_suspension_permanent_removal_by_admin(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new admin.
  const adminData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    role: RandomGenerator.pick([
      "super",
      "support",
      "operator",
      "compliance",
    ] as const),
    status: RandomGenerator.pick(["active", "pending", "suspended"] as const),
  } satisfies IShoppingAdmin.IJoin;
  const admin: IShoppingAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminData });
  typia.assert(admin);

  // 2. Attempt to delete an existing suspension record (simulate with a random UUID)
  const targetSuspensionId = typia.random<string & tags.Format<"uuid">>();
  await api.functional.shopping.admin.adminSuspensions.erase(connection, {
    adminSuspensionId: targetSuspensionId,
  });

  // 3. Attempt deleting a non-existent suspension (new random UUID). Expect error.
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "delete non-existent admin suspension should throw",
    async () => {
      await api.functional.shopping.admin.adminSuspensions.erase(connection, {
        adminSuspensionId: nonExistentId,
      });
    },
  );

  // 4. Attempt deletion as an unauthorized actor (simulate by clearing headers).
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  const anySuspensionId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "unauthorized deletion by no-auth user should throw",
    async () => {
      await api.functional.shopping.admin.adminSuspensions.erase(unauthConn, {
        adminSuspensionId: anySuspensionId,
      });
    },
  );

  // 5. Attempt to delete a 'protected' or reserved UUID (simulate protected record scenario)
  // Here, we define a UUID that's likely reserved -- for this test, pick a static or special-case UUID.
  const protectedId: string & tags.Format<"uuid"> =
    "00000000-0000-0000-0000-000000000001" as string & tags.Format<"uuid">;
  await TestValidator.error(
    "protected admin suspension deletion should throw",
    async () => {
      await api.functional.shopping.admin.adminSuspensions.erase(connection, {
        adminSuspensionId: protectedId,
      });
    },
  );
}
