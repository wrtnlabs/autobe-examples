import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import type { ITodoListSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSystemConfig";

/**
 * Validate the ability of an authenticated admin to archive (soft-delete) a
 * system-wide configuration.
 *
 * 1. Register a new admin to establish authentication context
 * 2. Create a mock system configuration entry (in place of missing create API, use
 *    typia.random and simulate insertion)
 * 3. Attempt the soft-delete operation (archive) as an admin
 * 4. Validate 'deleted_at' timestamp is set on the returned entity
 * 5. Attempt to delete the same configuration again and expect an error
 * 6. Attempt to delete a random non-existent configuration and expect an error
 */
export async function test_api_system_config_soft_delete_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a new admin
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
  } satisfies ITodoListAdmin.IJoin;
  const admin: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Simulate inserting a system config (since no API available), use typia.random and imagine it is present in DB
  const config = typia.random<ITodoListSystemConfig>();

  // 3. Perform soft-delete by admin
  const erased: ITodoListSystemConfig =
    await api.functional.todoList.admin.systemConfigs.eraseBySystemconfigid(
      connection,
      { systemConfigId: config.id },
    );
  typia.assert(erased);
  TestValidator.equals(
    "system config deleted_at set after soft-delete",
    erased.deleted_at !== null && erased.deleted_at !== undefined,
    true,
  );

  // 4. Try to delete the same config (now soft-deleted) again - expect error
  await TestValidator.error(
    "cannot soft-delete system config already deleted",
    async () => {
      await api.functional.todoList.admin.systemConfigs.eraseBySystemconfigid(
        connection,
        { systemConfigId: config.id },
      );
    },
  );

  // 5. Try to delete a non-existent config by passing a random UUID
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "cannot soft-delete non-existent system config",
    async () => {
      await api.functional.todoList.admin.systemConfigs.eraseBySystemconfigid(
        connection,
        { systemConfigId: nonExistentId },
      );
    },
  );
}
