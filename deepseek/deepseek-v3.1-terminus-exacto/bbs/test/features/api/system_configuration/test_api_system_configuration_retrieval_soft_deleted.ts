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

export async function test_api_system_configuration_retrieval_soft_deleted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // 2. Create a system configuration
  const configuration =
    await generate_random_discussion_board_super_admin_system_configurations_create(
      superAdminConnection,
      {
        body: {
          key: `test.config.${RandomGenerator.alphaNumeric(8)}`,
          value: RandomGenerator.paragraph({ sentences: 2 }),
          data_type: "string",
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardSystemConfiguration.ICreate,
      },
    );
  typia.assert(configuration);
  // 3. Soft-delete the configuration
  await api.functional.discussionBoard.superAdmin.system_configurations.erase(
    superAdminConnection,
    {
      configId: configuration.id,
    },
  );
  // 4. Retrieve the soft-deleted configuration
  const retrievedConfiguration =
    await api.functional.discussionBoard.superAdmin.system_configurations.at(
      superAdminConnection,
      {
        configId: configuration.id,
      },
    );
  typia.assert(retrievedConfiguration);
  // 5. Validate that all original fields remain intact
  TestValidator.equals(
    "configuration id matches",
    retrievedConfiguration.id,
    configuration.id,
  );
  TestValidator.equals(
    "configuration key matches",
    retrievedConfiguration.key,
    configuration.key,
  );
  TestValidator.equals(
    "configuration value matches",
    retrievedConfiguration.value,
    configuration.value,
  );
  TestValidator.equals(
    "data type matches",
    retrievedConfiguration.data_type,
    configuration.data_type,
  );
  TestValidator.equals(
    "description matches",
    retrievedConfiguration.description,
    configuration.description,
  );
  TestValidator.equals(
    "created at matches",
    retrievedConfiguration.created_at,
    configuration.created_at,
  );
  TestValidator.equals(
    "updated at matches",
    retrievedConfiguration.updated_at,
    configuration.updated_at,
  );
  // 6. Validate that deleted_at field contains a timestamp
  TestValidator.predicate(
    "deleted_at is not null",
    retrievedConfiguration.deleted_at !== null,
  );
}
