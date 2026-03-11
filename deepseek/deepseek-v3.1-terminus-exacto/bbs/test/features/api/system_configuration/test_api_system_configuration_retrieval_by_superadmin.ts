import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemConfiguration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_super_admin_system_configurations_create } from "../../../generate/generate_random_discussion_board_super_admin_system_configurations_create";
import { prepare_random_discussion_board_system_configuration } from "../../../prepare/prepare_random_discussion_board_system_configuration";

/**
 * Test the successful retrieval of an active system configuration by a super administrator.
 * Validates that a super admin can authenticate, create a system configuration, and then retrieve it
 * using the GET endpoint. Verifies that all configuration fields are correctly returned.
 */
export async function test_api_system_configuration_retrieval_by_superadmin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(authResult);
  // Validate authorization token is set
  TestValidator.predicate(
    "authorization token should be set",
    superAdminConnection.headers?.Authorization !== undefined,
  );
  // 2. Create a system configuration with random valid data type
  const dataTypes = [
    "string",
    "integer",
    "double",
    "boolean",
    "json",
    "datetime",
    "uri",
  ] as const;
  const randomDataType = RandomGenerator.pick(dataTypes);
  const configuration =
    await generate_random_discussion_board_super_admin_system_configurations_create(
      superAdminConnection,
      {
        body: {
          key: `system.config.${RandomGenerator.alphabets(8)}`,
          value: RandomGenerator.paragraph({ sentences: 2 }),
          data_type: randomDataType,
          description: RandomGenerator.content({ paragraphs: 1 }),
        } satisfies IDiscussionBoardSystemConfiguration.ICreate,
      },
    );
  typia.assert(configuration);
  // 3. Retrieve the configuration using the GET endpoint
  const retrievedConfig =
    await api.functional.discussionBoard.superAdmin.system_configurations.at(
      superAdminConnection,
      {
        configId: configuration.id,
      },
    );
  typia.assert(retrievedConfig);
  // 4. Validate that all configuration fields are correctly returned
  TestValidator.equals(
    "configuration id matches",
    retrievedConfig.id,
    configuration.id,
  );
  TestValidator.equals(
    "configuration key matches",
    retrievedConfig.key,
    configuration.key,
  );
  TestValidator.equals(
    "configuration value matches",
    retrievedConfig.value,
    configuration.value,
  );
  TestValidator.equals(
    "configuration data_type matches",
    retrievedConfig.data_type,
    configuration.data_type,
  );
  TestValidator.equals(
    "configuration description matches",
    retrievedConfig.description,
    configuration.description,
  );
  TestValidator.equals(
    "configuration created_at matches",
    retrievedConfig.created_at,
    configuration.created_at,
  );
  TestValidator.equals(
    "configuration updated_at matches",
    retrievedConfig.updated_at,
    configuration.updated_at,
  );
  TestValidator.equals(
    "deleted_at should be null for active configuration",
    retrievedConfig.deleted_at,
    null,
  );
}
