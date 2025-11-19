import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardRegisteredUser";

export async function test_api_registered_users_retrieval_by_moderator(
  connection: api.IConnection,
) {
  // Create a moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: "1234",
      username: RandomGenerator.name(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Create a registered user
  const registeredUserEmail = typia.random<string & tags.Format<"email">>();
  const registeredUser =
    await api.functional.discussionBoard.registeredUsers.create(connection, {
      body: registeredUserEmail,
    });
  typia.assert(registeredUser);

  // Retrieve registered users using moderator account
  const registeredUsersPage =
    await api.functional.discussionBoard.moderator.registeredUsers.index(
      connection,
      {
        body: {
          limit: 10,
          page: 1,
        } satisfies IDiscussionBoardRegisteredUser.IRequest,
      },
    );
  typia.assert(registeredUsersPage);

  // Validate the retrieved registered users
  TestValidator.equals(
    "registered user count",
    registeredUsersPage.data.length,
    1,
  );
  TestValidator.equals(
    "registered user email",
    registeredUsersPage.data[0],
    registeredUserEmail,
  );
}
