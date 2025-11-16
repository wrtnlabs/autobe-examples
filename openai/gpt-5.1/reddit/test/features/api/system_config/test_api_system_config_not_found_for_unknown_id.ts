import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemConfig";

/**
 * Validate not-found behavior when retrieving a non-existent system
 * configuration.
 *
 * Business context: Administrative tooling for the community platform lets
 * adminUser actors inspect and manage global system configuration entries
 * stored in `community_platform_system_configs`. The detail endpoint must
 * strictly enforce existence checks and surface a clear not-found style error
 * when an admin requests a configuration id that does not exist, even though
 * they are fully authenticated.
 *
 * This test ensures that:
 *
 * - An adminUser can join and obtain an authorized context.
 * - The system configuration subsystem is operational by successfully creating at
 *   least one configuration entry.
 * - A GET for an unknown system configuration id results in an HttpError
 *   (client-side not-found style), rather than leaking any partial or default
 *   configuration data.
 *
 * High level steps:
 *
 * 1. Register an adminUser via POST /auth/adminUser/join.
 * 2. Optionally create a valid system configuration entry via POST
 *    /communityPlatform/adminUser/systemConfigs to sanity check the subsystem
 *    and to obtain a real id for contrast.
 * 3. Generate a random UUID that is different from any known configuration id
 *    (e.g., different from the id returned by the create call).
 * 4. Call GET /communityPlatform/adminUser/systemConfigs/{systemConfigId} with
 *    this unknown id.
 * 5. Expect the call to fail with an HttpError (not-found style); if it
 *    unexpectedly succeeds, the test must fail.
 */
export async function test_api_system_config_not_found_for_unknown_id(
  connection: api.IConnection,
) {
  // 1. Register an adminUser and establish authenticated context
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminUser: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert(adminUser);
  typia.assert<IAuthorizationToken>(adminUser.token);

  // 2. Optionally create one valid configuration entry for sanity check
  const createBody = {
    category: "auth",
    config_key: "max_login_attempts",
    value: "5",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    is_active: true,
  } satisfies ICommunityPlatformSystemConfig.ICreate;

  const createdConfig: ICommunityPlatformSystemConfig =
    await api.functional.communityPlatform.adminUser.systemConfigs.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(createdConfig);

  // 3. Generate a random UUID and ensure it differs from the created id
  let unknownSystemConfigId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  if (unknownSystemConfigId === createdConfig.id) {
    // Extremely unlikely, but guard against accidental collision
    unknownSystemConfigId = typia.random<string & tags.Format<"uuid">>();
  }

  // 4 & 5. Call GET with the unknown id and expect an HttpError
  await TestValidator.httpError(
    "requesting non-existent system config id should result in not-found style HttpError",
    [400, 404, 422],
    async () => {
      // If this resolves without throwing, the validator will fail the test
      await api.functional.communityPlatform.adminUser.systemConfigs.at(
        connection,
        {
          systemConfigId: unknownSystemConfigId,
        },
      );
    },
  );
}
