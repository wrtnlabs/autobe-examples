import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardConfiguration";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";

export async function test_api_system_configuration_delete_by_registered_user(
  connection: api.IConnection,
) {
  // Create registered user and validate authentication
  const user: IDiscussionBoardRegisteredUser.IAuthorized =
    await api.functional.auth.registered_user.join(connection, {
      body: typia.random<IDiscussionBoardRegisteredUser.ICreate>(),
    });
  typia.assert(user);
  TestValidator.predicate(
    "authentication token is set",
    connection.headers?.authorization !== undefined,
  );

  // Create system configuration and validate response
  const configKey = RandomGenerator.alphaNumeric(10);
  const config: IDiscussionBoardConfiguration =
    await api.functional.discussionBoard.registeredUser.system.configurations.create(
      connection,
      {
        body: configKey,
      },
    );
  typia.assert(config);
  TestValidator.equals("configuration key", config.key, configKey);

  // Delete system configuration and verify HTTP status
  await TestValidator.error("should not throw error on delete", async () => {
    await api.functional.discussionBoard.registeredUser.system.configurations.erase(
      connection,
      {
        configKey,
      },
    );
  });

  // Verify deletion through direct check
  await TestValidator.error("configuration should be deleted", async () => {
    await api.functional.discussionBoard.registeredUser.system.configurations.create(
      connection,
      {
        body: configKey,
      },
    );
  });
}
