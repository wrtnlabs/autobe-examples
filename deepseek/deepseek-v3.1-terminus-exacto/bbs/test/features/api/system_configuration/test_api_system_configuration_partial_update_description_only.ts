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

export async function test_api_system_configuration_partial_update_description_only(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Create initial configuration
  const initialConfig =
    await generate_random_discussion_board_super_admin_system_configurations_create(
      superAdminConnection,
      {
        body: {
          key: `test.config.${RandomGenerator.alphaNumeric(8)}`,
          value: "production setting",
          data_type: "string",
          description: "Original description",
        } satisfies IDiscussionBoardSystemConfiguration.ICreate,
      },
    );
  typia.assert(initialConfig);
  // Perform partial update - only description
  const updatedConfig =
    await api.functional.discussionBoard.superAdmin.system_configurations.update(
      superAdminConnection,
      {
        configId: initialConfig.id,
        body: {
          description: "Updated detailed explanation",
        } satisfies IDiscussionBoardSystemConfiguration.IUpdate,
      },
    );
  typia.assert(updatedConfig);
  // Validate partial update behavior
  TestValidator.equals(
    "configuration ID remains unchanged",
    updatedConfig.id,
    initialConfig.id,
  );
  TestValidator.equals(
    "key remains unchanged",
    updatedConfig.key,
    initialConfig.key,
  );
  TestValidator.equals(
    "value remains unchanged",
    updatedConfig.value,
    initialConfig.value,
  );
  TestValidator.equals(
    "data_type remains unchanged",
    updatedConfig.data_type,
    initialConfig.data_type,
  );
  TestValidator.equals(
    "description is updated",
    updatedConfig.description,
    "Updated detailed explanation",
  );
  TestValidator.notEquals(
    "updated_at timestamp changed",
    updatedConfig.updated_at,
    initialConfig.updated_at,
  );
}
