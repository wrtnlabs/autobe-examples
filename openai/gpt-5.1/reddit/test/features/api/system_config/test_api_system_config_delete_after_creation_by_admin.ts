import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemConfig";

/**
 * Validate admin-only deletion of a system configuration entry.
 *
 * Business goal: Ensure that an authenticated adminUser can create a new system
 * configuration row and then successfully delete it using the
 * `/communityPlatform/adminUser/systemConfigs/{systemConfigId}` DELETE
 * endpoint, and confirm that the deleted configuration can no longer be
 * retrieved by id.
 *
 * Steps:
 *
 * 1. Join as a fresh adminUser to obtain an authorized context and configure the
 *    SDK connection with an admin JWT.
 * 2. As that admin, create a new system configuration entry with a unique
 *    `config_key` using the create endpoint.
 * 3. Optionally read the configuration back by id to confirm creation.
 * 4. Delete the configuration using the erase endpoint.
 * 5. Attempt to read the configuration again and expect an error, asserting only
 *    that an error occurs (no status-code checks).
 */
export async function test_api_system_config_delete_after_creation_by_admin(
  connection: api.IConnection,
) {
  // 1. Join as a fresh adminUser to obtain authorized context.
  const joinBody = {
    username: RandomGenerator.alphabets(12),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: "AdminPw123!" as string & tags.Format<"password">,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized = await api.functional.auth.adminUser.join(connection, {
    body: joinBody,
  });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminAuthorized);

  // 2. Create a new system configuration entry.
  const configKeyPrefix = "e2e_rate_limit_";
  const configKeyRandomSuffix = RandomGenerator.alphabets(8);
  const createBody = {
    category: "rate_limit",
    config_key: `${configKeyPrefix}${configKeyRandomSuffix}` as string &
      tags.MinLength<1>,
    value: "100" as string & tags.MinLength<1>,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    is_active: true,
  } satisfies ICommunityPlatformSystemConfig.ICreate;

  const createdConfig =
    await api.functional.communityPlatform.adminUser.systemConfigs.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert<ICommunityPlatformSystemConfig>(createdConfig);

  // 3. Optionally read back by id to confirm creation.
  const fetchedBeforeDelete =
    await api.functional.communityPlatform.adminUser.systemConfigs.at(
      connection,
      {
        systemConfigId: createdConfig.id,
      },
    );
  typia.assert<ICommunityPlatformSystemConfig>(fetchedBeforeDelete);
  TestValidator.equals(
    "fetched config before delete matches created id",
    fetchedBeforeDelete.id,
    createdConfig.id,
  );

  // 4. Delete the configuration using the erase endpoint.
  await api.functional.communityPlatform.adminUser.systemConfigs.erase(
    connection,
    {
      systemConfigId: createdConfig.id,
    },
  );

  // 5. Confirm that reading by the same id fails after deletion.
  await TestValidator.error(
    "fetching deleted system config by id should fail",
    async () => {
      await api.functional.communityPlatform.adminUser.systemConfigs.at(
        connection,
        {
          systemConfigId: createdConfig.id,
        },
      );
    },
  );
}
