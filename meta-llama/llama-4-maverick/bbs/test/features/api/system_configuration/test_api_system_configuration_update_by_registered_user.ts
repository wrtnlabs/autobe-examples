import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardConfiguration";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";

export async function test_api_system_configuration_update_by_registered_user(
  connection: api.IConnection,
) {
  // Step 1: Create registered user account for authentication
  const registeredUserEmail = typia.random<string & tags.Format<"email">>();
  const registeredUserAuth: IDiscussionBoardRegisteredUser.IAuthorized =
    await api.functional.auth.registered_user.join(connection, {
      body: registeredUserEmail,
    });
  typia.assert(registeredUserAuth);

  // Step 2: Create system configuration to update
  const configToUpdate: IDiscussionBoardConfiguration.ICreate =
    typia.random<IDiscussionBoardConfiguration.ICreate>();
  const createdConfig: IDiscussionBoardConfiguration =
    await api.functional.discussionBoard.registeredUser.system.configurations.create(
      connection,
      { body: configToUpdate },
    );
  typia.assert(createdConfig);

  // Step 3: Update system configuration
  const updatedConfigValue: IDiscussionBoardConfiguration.IUpdate =
    typia.random<IDiscussionBoardConfiguration.IUpdate>();
  const updatedConfig: IDiscussionBoardConfiguration =
    await api.functional.discussionBoard.registeredUser.system.configurations.update(
      connection,
      { configKey: createdConfig.key, body: updatedConfigValue },
    );
  typia.assert(updatedConfig);

  // Step 4: Verify updated configuration
  TestValidator.equals(
    "Updated config value matches",
    updatedConfig.value,
    updatedConfigValue,
  );

  // Additional verification: Check that other properties remain unchanged
  TestValidator.equals(
    "Config key remains the same",
    updatedConfig.key,
    createdConfig.key,
  );
}
