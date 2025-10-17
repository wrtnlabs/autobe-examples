import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemConfig";

/**
 * Validates the admin-only workflow for deleting a system configuration entry.
 *
 * 1. Registers a new admin via /auth/admin/join.
 * 2. Admin creates a system configuration record via
 *    /communityPlatform/admin/systemConfigs.
 * 3. Attempts deletion without admin auth (should fail).
 * 4. Performs deletion as the admin.
 * 5. Ensures deletion returns successfully and config is no longer accessible.
 * 6. Attempts to delete the same config a second time (should error).
 * 7. Attempts to delete a random non-existent config ID (should error).
 * 8. Confirms audit/correct trail would be written (if exposed).
 */
export async function test_api_admin_system_config_deletion_workflow(
  connection: api.IConnection,
) {
  // 1. Admin registration
  const adminBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    superuser: true,
  } satisfies ICommunityPlatformAdmin.ICreate;
  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminBody });
  typia.assert(admin);
  TestValidator.equals(
    "admin email matches input",
    admin.email,
    adminBody.email,
  );

  // 2. Create a system config entry
  const sysConfigBody = {
    key: RandomGenerator.alphaNumeric(12),
    value: RandomGenerator.alphaNumeric(8),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformSystemConfig.ICreate;
  const sysConfig: ICommunityPlatformSystemConfig =
    await api.functional.communityPlatform.admin.systemConfigs.create(
      connection,
      { body: sysConfigBody },
    );
  typia.assert(sysConfig);
  TestValidator.equals(
    "system config key matches input",
    sysConfig.key,
    sysConfigBody.key,
  );

  // 3. Attempt deletion without admin authentication (simulate logout)
  const noAuthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "delete fails for unauthenticated clients",
    async () => {
      await api.functional.communityPlatform.admin.systemConfigs.erase(
        noAuthConn,
        { systemConfigId: sysConfig.id },
      );
    },
  );

  // 4. Delete the system config as admin
  await api.functional.communityPlatform.admin.systemConfigs.erase(connection, {
    systemConfigId: sysConfig.id,
  });

  // 5. Confirm config is no longer accessible (assume GET endpoint would return error, just attempt delete again)
  await TestValidator.error(
    "deleting already deleted config yields error",
    async () => {
      await api.functional.communityPlatform.admin.systemConfigs.erase(
        connection,
        { systemConfigId: sysConfig.id },
      );
    },
  );

  // 6. Attempt to delete a non-existent config ID
  const fakeId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "deleting non-existent config yields error",
    async () => {
      await api.functional.communityPlatform.admin.systemConfigs.erase(
        connection,
        { systemConfigId: fakeId },
      );
    },
  );

  // 7. (Comment) Audit log/write validation - assume this is implemented, see system logs
  // (Audit log validation would be checked via separate API or system log, not feasible here)
}
