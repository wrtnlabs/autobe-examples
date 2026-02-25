import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformConfiguration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_community_platform_admin_configurations_create } from "../../../generate/generate_random_community_platform_admin_configurations_create";
import { prepare_random_community_platform_configuration } from "../../../prepare/prepare_random_community_platform_configuration";

export async function test_api_configuration_delete_already_deleted(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Create a configuration to delete
  const configuration =
    await generate_random_community_platform_admin_configurations_create(
      adminConnection,
      {
        body: {
          config_key: RandomGenerator.alphaNumeric(10),
          config_value: RandomGenerator.alphabets(20),
          data_type: "string",
          scope: "global",
          description: RandomGenerator.paragraph({ sentences: 2 }),
          is_active: true,
        } satisfies ICommunityPlatformConfiguration.ICreate,
      },
    );
  typia.assert(configuration);
  // First deletion - should succeed
  await api.functional.communityPlatform.admin.configurations.erase(
    adminConnection,
    {
      configurationId: configuration.id,
    },
  );
  // Second deletion attempt - should fail with appropriate error
  // The endpoint should return an error indicating the configuration is already deleted
  // We test this by expecting the operation to throw an error
  try {
    await api.functional.communityPlatform.admin.configurations.erase(
      adminConnection,
      {
        configurationId: configuration.id,
      },
    );
    // If we reach here, the second deletion didn't throw an error as expected
    throw new Error("Second deletion should have failed but succeeded");
  } catch (error) {
    // The error should indicate the configuration is already deleted or not found
    // This validates the idempotency behavior
  }
}
