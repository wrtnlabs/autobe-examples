import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemConfig";

/**
 * Validate retrieval of system configuration details by admin, error handling
 * for missing resource, and 403 for non-admin.
 *
 * Steps:
 *
 * 1. Register an admin and obtain authentication
 * 2. Create a new system configuration entry (with key, value, description)
 * 3. Retrieve config detail by ID, ensure returned fields match creation
 * 4. Attempt retrieval with random/unassigned UUID (should throw 404)
 * 5. Attempt retrieval with unauthenticated (non-admin) should throw 403
 */
export async function test_api_system_config_detail_retrieval_by_admin(
  connection: api.IConnection,
) {
  // 1. Register new admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminResp = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      superuser: false,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(adminResp);
  // 2. Create system config
  const configBody = {
    key: RandomGenerator.alphabets(12),
    value: RandomGenerator.alphabets(16),
    description: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies ICommunityPlatformSystemConfig.ICreate;
  const createdConfig =
    await api.functional.communityPlatform.admin.systemConfigs.create(
      connection,
      {
        body: configBody,
      },
    );
  typia.assert(createdConfig);
  // 3. Retrieve by ID and validate all fields
  const retrieved =
    await api.functional.communityPlatform.admin.systemConfigs.at(connection, {
      systemConfigId: createdConfig.id,
    });
  typia.assert(retrieved);
  TestValidator.equals(
    "system config ID matches",
    retrieved.id,
    createdConfig.id,
  );
  TestValidator.equals(
    "system config key matches",
    retrieved.key,
    configBody.key,
  );
  TestValidator.equals(
    "system config value matches",
    retrieved.value,
    configBody.value,
  );
  TestValidator.equals(
    "system config description matches",
    retrieved.description,
    configBody.description,
  );
  // 4. Attempt to retrieve non-existent config ID (should throw 404)
  const randomId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("404 on non-existing config ID", async () => {
    await api.functional.communityPlatform.admin.systemConfigs.at(connection, {
      systemConfigId: randomId,
    });
  });
  // 5. Attempt to get config as non-admin (should throw 403)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "403 on retrieving config as non-admin",
    async () => {
      await api.functional.communityPlatform.admin.systemConfigs.at(
        unauthConn,
        {
          systemConfigId: createdConfig.id,
        },
      );
    },
  );
}
