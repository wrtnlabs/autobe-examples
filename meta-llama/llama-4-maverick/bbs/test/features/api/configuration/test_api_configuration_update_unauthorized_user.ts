import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardConfiguration";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";

export async function test_api_configuration_update_unauthorized_user(
  connection: api.IConnection,
) {
  // Create a new registered user
  const registeredUser: IDiscussionBoardRegisteredUser.IAuthorized =
    await api.functional.auth.registered_user.join(connection, {
      body: typia.random<IDiscussionBoardRegisteredUser.ICreate>(),
    });
  typia.assert(registeredUser);

  // Create a new moderator user
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: typia.random<IDiscussionBoardModerator.ICreate>(),
    });
  typia.assert(moderator);

  // Switch to registered user
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // Attempt to update configuration as registered user
  await TestValidator.error(
    "should fail updating configuration as non-moderator",
    async () => {
      await api.functional.discussionBoard.moderator.system.configurations.update(
        unauthConn,
        {
          body: typia.random<IDiscussionBoardConfiguration.IUpdate>(),
        },
      );
    },
  );
}
