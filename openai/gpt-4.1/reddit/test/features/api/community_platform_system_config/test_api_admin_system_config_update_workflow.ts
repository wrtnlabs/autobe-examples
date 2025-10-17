import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemConfig";

/**
 * Validate updating an existing system configuration as an admin.
 *
 * Steps:
 *
 * 1. Register a new platform admin (with unique email).
 * 2. Authenticate as this admin (authorization is handled by SDK join).
 * 3. Create a system configuration entry (with random key, value, and optional
 *    description).
 * 4. Update the system config by changing its key, value, or description (all
 *    updatable fields).
 * 5. Assert the updated config matches the update input.
 */
export async function test_api_admin_system_config_update_workflow(
  connection: api.IConnection,
) {
  // Step 1. Register a new admin
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphaNumeric(12),
        superuser: false,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2/3. Create a system configuration entry
  const createBody = {
    key: RandomGenerator.alphabets(10),
    value: RandomGenerator.alphaNumeric(16),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformSystemConfig.ICreate;
  const createdConfig: ICommunityPlatformSystemConfig =
    await api.functional.communityPlatform.admin.systemConfigs.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(createdConfig);
  TestValidator.equals(
    "created config matches input key",
    createdConfig.key,
    createBody.key,
  );
  TestValidator.equals(
    "created config matches input value",
    createdConfig.value,
    createBody.value,
  );
  TestValidator.equals(
    "created config matches input description",
    createdConfig.description,
    createBody.description,
  );

  // Step 4. Update the system config (change key, value, or description)
  const updateBody = {
    key: RandomGenerator.alphabets(11),
    value: RandomGenerator.alphaNumeric(18),
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformSystemConfig.IUpdate;
  const updatedConfig: ICommunityPlatformSystemConfig =
    await api.functional.communityPlatform.admin.systemConfigs.update(
      connection,
      {
        systemConfigId: createdConfig.id,
        body: updateBody,
      },
    );
  typia.assert(updatedConfig);

  // Step 5. Assert the updated config matches the update
  TestValidator.equals(
    "updated config id remains the same",
    updatedConfig.id,
    createdConfig.id,
  );
  TestValidator.equals("updated config key", updatedConfig.key, updateBody.key);
  TestValidator.equals(
    "updated config value",
    updatedConfig.value,
    updateBody.value,
  );
  TestValidator.equals(
    "updated config description",
    updatedConfig.description,
    updateBody.description,
  );
}
