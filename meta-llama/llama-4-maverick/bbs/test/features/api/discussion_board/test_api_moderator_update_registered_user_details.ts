import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";

export async function test_api_moderator_update_registered_user_details(
  connection: api.IConnection,
) {
  // Authenticate as moderator
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "1234",
        username: RandomGenerator.name(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Create a registered user to update
  const registeredUser: IDiscussionBoardRegisteredUser =
    await api.functional.discussionBoard.registeredUsers.create(connection, {
      body: typia.random<IDiscussionBoardRegisteredUser.ICreate>(),
    });
  typia.assert(registeredUser);

  // Update the registered user's details
  const updatedUser: IDiscussionBoardRegisteredUser =
    await api.functional.discussionBoard.moderator.registeredUsers.update(
      connection,
      {
        userId: registeredUser.id,
        body: typia.random<IDiscussionBoardRegisteredUser.IUpdate>(),
      },
    );
  typia.assert(updatedUser);

  // Verify the update was successful
  TestValidator.equals(
    "Updated user ID matches",
    updatedUser.id,
    registeredUser.id,
  );
}
