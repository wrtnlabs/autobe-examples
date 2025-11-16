import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemConfig";

/**
 * Confirm that updating a system configuration with a non-existent id fails
 * with not-found.
 *
 * This test ensures that the systemConfigs.update endpoint does not perform an
 * upsert when the given systemConfigId does not correspond to an existing
 * configuration row. Instead, it should respond with an HttpError representing
 * a 404 Not Found (or equivalent not-found semantics) and must not create a
 * configuration implicitly.
 *
 * Steps:
 *
 * 1. Join an adminUser using the auth.adminUser.join endpoint, which also wires
 *    the Authorization header onto the connection for subsequent admin-only
 *    calls.
 * 2. Optionally create one valid system configuration via
 *    communityPlatform.adminUser.systemConfigs.create to prove that existing
 *    rows behave normally and to ensure the system has at least one record.
 * 3. Generate a random UUID for systemConfigId that is overwhelmingly unlikely to
 *    collide with an existing configuration id.
 * 4. Prepare an ICommunityPlatformSystemConfig.IUpdate payload to modify value,
 *    description, and is_active.
 * 5. Call communityPlatform.adminUser.systemConfigs.update with the random
 *    systemConfigId and the update payload inside a TestValidator.httpError
 *    wrapper, asserting that a 404 status is raised.
 * 6. Do not attempt any read/search verification, as only create and update
 *    functions are available; the absence of an upsert is inferred from the
 *    not-found error and the distinct create endpoint.
 */
export async function test_api_system_config_update_nonexistent_id_returns_not_found(
  connection: api.IConnection,
) {
  // 1. Create an admin user (authorized context)
  const joinBody = typia.random<ICommunityPlatformAdminUserJoin.IRequest>();
  const admin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Optionally create a valid configuration to ensure the system has at least one row
  const createdConfig: ICommunityPlatformSystemConfig =
    await api.functional.communityPlatform.adminUser.systemConfigs.create(
      connection,
      {
        body: typia.random<ICommunityPlatformSystemConfig.ICreate>(),
      },
    );
  typia.assert(createdConfig);

  // 3. Generate a random UUID for a non-existent systemConfigId
  const nonexistentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 4. Prepare an update payload
  const updateBody = typia.random<ICommunityPlatformSystemConfig.IUpdate>();

  // 5. Call update with the random id and assert not-found HttpError (404)
  await TestValidator.httpError(
    "updating non-existent system config id should result in 404 not-found",
    404,
    async () => {
      await api.functional.communityPlatform.adminUser.systemConfigs.update(
        connection,
        {
          systemConfigId: nonexistentId,
          body: updateBody,
        },
      );
    },
  );
}
