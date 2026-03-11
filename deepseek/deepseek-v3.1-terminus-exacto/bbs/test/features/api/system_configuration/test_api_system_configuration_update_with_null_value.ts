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

export async function test_api_system_configuration_update_with_null_value(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_super_admin_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IDiscussionBoardSuperAdmin.IJoin,
    },
  );
  typia.assert(superAdminAuth);
  // Create a system configuration with active value
  const createBody = {
    key: `test.config.${RandomGenerator.alphaNumeric(8)}`,
    value: "active value",
    data_type: "string",
    description: "Active configuration",
  } satisfies IDiscussionBoardSystemConfiguration.ICreate;
  const createdConfig =
    await generate_random_discussion_board_super_admin_system_configurations_create(
      superAdminConnection,
      { body: createBody },
    );
  typia.assert(createdConfig);
  // Verify initial configuration
  TestValidator.equals("key matches", createdConfig.key, createBody.key);
  TestValidator.equals("value matches", createdConfig.value, createBody.value);
  TestValidator.equals(
    "data_type matches",
    createdConfig.data_type,
    createBody.data_type,
  );
  TestValidator.equals(
    "description matches",
    createdConfig.description,
    createBody.description,
  );
  // Update configuration with null value and new description
  const updateBody = {
    value: null,
    description: "Configuration with cleared value",
  } satisfies IDiscussionBoardSystemConfiguration.IUpdate;
  const updatedConfig =
    await api.functional.discussionBoard.superAdmin.system_configurations.update(
      superAdminConnection,
      {
        configId: createdConfig.id,
        body: updateBody,
      },
    );
  typia.assert(updatedConfig);
  // Validate the update response
  TestValidator.equals(
    "id remains unchanged",
    updatedConfig.id,
    createdConfig.id,
  );
  TestValidator.equals(
    "key remains unchanged",
    updatedConfig.key,
    createdConfig.key,
  );
  TestValidator.equals(
    "data_type remains unchanged",
    updatedConfig.data_type,
    createdConfig.data_type,
  );
  TestValidator.equals("value is cleared to null", updatedConfig.value, null);
  TestValidator.equals(
    "description is updated",
    updatedConfig.description,
    updateBody.description,
  );
  TestValidator.predicate(
    "created_at exists",
    updatedConfig.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at exists",
    updatedConfig.updated_at !== undefined,
  );
  TestValidator.notEquals(
    "updated_at changed",
    updatedConfig.updated_at,
    createdConfig.updated_at,
  );
  // Verify that the configuration object is complete
  TestValidator.predicate("id exists", updatedConfig.id !== undefined);
  TestValidator.predicate("key exists", updatedConfig.key !== undefined);
  TestValidator.predicate(
    "data_type exists",
    updatedConfig.data_type !== undefined,
  );
  TestValidator.predicate(
    "description exists",
    updatedConfig.description !== undefined,
  );
  TestValidator.predicate(
    "created_at exists",
    updatedConfig.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at exists",
    updatedConfig.updated_at !== undefined,
  );
}
