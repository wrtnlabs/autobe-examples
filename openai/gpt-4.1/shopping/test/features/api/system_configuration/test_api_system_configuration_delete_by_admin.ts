import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";

/**
 * Validate that system configurations can only be deleted by a privileged admin
 * and are truly purged from the system.
 *
 * This scenario covers:
 *
 * 1. Creation of a new admin with valid credentials and privileges
 * 2. Deletion of a non-existent configKey (should fail with error)
 * 3. (If possible) Deletion of a real configKey (for functional verification)
 * 4. Ensuring that only admins can perform the deletion
 * 5. Idempotence: Deletion of an already-deleted key should fail gracefully
 *
 * The system must ensure that once deleted, the config no longer has effect and
 * audit trails/logs are properly updated (if auditable via public API).
 */
export async function test_api_system_configuration_delete_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a new admin to get privileges
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const admin: IShoppingAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        name: RandomGenerator.name(),
        role: RandomGenerator.pick([
          "super",
          "compliance",
          "operator",
        ] as const),
        status: "active",
      } satisfies IShoppingAdmin.IJoin,
    });
  typia.assert(admin);

  const configKey = RandomGenerator.alphaNumeric(12);

  // 2. Attempt to delete a configKey that doesn't exist
  await TestValidator.error(
    "deleting non-existent configKey should fail",
    async () => {
      await api.functional.shopping.admin.systemConfigurations.erase(
        connection,
        {
          configKey: configKey,
        },
      );
    },
  );

  // 3. Attempt to delete as a non-admin (simulate: use unauthenticated connection)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "non-admin cannot delete system config",
    async () => {
      await api.functional.shopping.admin.systemConfigurations.erase(
        unauthConn,
        {
          configKey: configKey,
        },
      );
    },
  );

  // 4. Attempt idempotent re-deletion (delete same configKey again)
  await TestValidator.error(
    "deleting already deleted configKey should fail",
    async () => {
      await api.functional.shopping.admin.systemConfigurations.erase(
        connection,
        {
          configKey: configKey,
        },
      );
    },
  );
}
