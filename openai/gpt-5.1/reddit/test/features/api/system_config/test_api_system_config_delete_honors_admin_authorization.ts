import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemConfig";

/**
 * Verify that deleting a system configuration honors adminUser authorization.
 *
 * Business goals:
 *
 * - Only authenticated adminUser actors can delete entries in
 *   `community_platform_system_configs`.
 * - A valid admin JWT (established via /auth/adminUser/join) must be both
 *   necessary and sufficient to perform DELETE
 *   /communityPlatform/adminUser/systemConfigs/{systemConfigId}.
 * - Unauthenticated calls must fail when attempting the same destructive
 *   operation.
 *
 * Scenario steps:
 *
 * 1. Register an adminUser via POST /auth/adminUser/join. This both creates the
 *    admin account and establishes an authenticated session by setting
 *    `connection.headers.Authorization` to the issued access token.
 * 2. As this authenticated adminUser, create a concrete system configuration via
 *    POST /communityPlatform/adminUser/systemConfigs and capture its id.
 * 3. Using a fresh unauthenticated connection (no Authorization header), attempt
 *    to delete that configuration and assert that the call fails with an error
 *    using TestValidator.error.
 * 4. Using the original authenticated admin connection, delete the same
 *    configuration via DELETE
 *    /communityPlatform/adminUser/systemConfigs/{systemConfigId} and ensure the
 *    call succeeds.
 * 5. Optionally call DELETE again as admin to tolerate idempotent behavior and
 *    prove that the endpoint can be safely retried without breaking the test.
 */
export async function test_api_system_config_delete_honors_admin_authorization(
  connection: api.IConnection,
) {
  // 1. Register and authenticate an adminUser so that `connection` carries
  // a valid admin token in its Authorization header.
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized = await api.functional.auth.adminUser.join(connection, {
    body: joinBody,
  });
  typia.assert(adminAuthorized);

  // 2. Create a concrete system configuration entry as this admin.
  // Use a unique config_key per run to avoid uniqueness conflicts.
  const createBody = {
    category: "auth",
    config_key: `max_login_attempts_${RandomGenerator.alphaNumeric(8)}`,
    value: "5",
    description: "Maximum number of login attempts before lockout in E2E test",
    is_active: true,
  } satisfies ICommunityPlatformSystemConfig.ICreate;

  const createdConfig =
    await api.functional.communityPlatform.adminUser.systemConfigs.create(
      connection,
      { body: createBody },
    );
  typia.assert(createdConfig);

  // 3. Attempt deletion without authorization to ensure access control
  // is enforced. We construct a fresh connection that has the same host
  // but no Authorization header, without touching the original connection.
  const unauthConnection: api.IConnection = {
    host: connection.host,
  };

  await TestValidator.error(
    "unauthenticated erase must be rejected",
    async () => {
      await api.functional.communityPlatform.adminUser.systemConfigs.erase(
        unauthConnection,
        { systemConfigId: createdConfig.id },
      );
    },
  );

  // 4. Delete the configuration using the authenticated admin connection.
  await api.functional.communityPlatform.adminUser.systemConfigs.erase(
    connection,
    { systemConfigId: createdConfig.id },
  );

  // 5. For idempotency, calling erase again as admin should not break the test
  // even if the backend chooses to treat it as not-found.
  await api.functional.communityPlatform.adminUser.systemConfigs.erase(
    connection,
    { systemConfigId: createdConfig.id },
  );
}
