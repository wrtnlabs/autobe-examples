import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import type { IDiscussionBoardRegisteredUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUserSession";

export async function test_api_session_deletion_by_user(
  connection: api.IConnection,
) {
  // Step 1: Create a new registered user account
  const userEmail = typia.random<string & tags.Format<"email">>();
  const registeredUser: IDiscussionBoardRegisteredUser.IAuthorized =
    await api.functional.auth.registered_user.join(connection, {
      body: userEmail satisfies IDiscussionBoardRegisteredUser.ICreate,
    });
  typia.assert(registeredUser);

  // Step 2: Create a registered user profile
  const userProfile: IDiscussionBoardRegisteredUser =
    await api.functional.discussionBoard.registeredUsers.create(connection, {
      body: registeredUser.id satisfies IDiscussionBoardRegisteredUser.ICreate,
    });
  typia.assert(userProfile);
  TestValidator.equals("user ID matches", userProfile.id, registeredUser.id);

  // Step 3: Create a new session for the registered user
  const session: IDiscussionBoardRegisteredUserSession =
    await api.functional.discussionBoard.registeredUser.registeredUsers.sessions.create(
      connection,
      {
        userId: registeredUser.id,
        body: registeredUser.id satisfies IDiscussionBoardRegisteredUserSession.ICreate,
      },
    );
  typia.assert(session);
  TestValidator.equals(
    "session user ID matches",
    session.userId,
    registeredUser.id,
  );

  // Step 4: Delete the session
  await api.functional.discussionBoard.registeredUser.registeredUsers.sessions.erase(
    connection,
    {
      userId: registeredUser.id,
      sessionId: session.id,
    },
  );

  // Step 5: Verify that the session is deleted
  await TestValidator.error("deleted session should fail", async () => {
    await api.functional.discussionBoard.registeredUser.registeredUsers.sessions.create(
      connection,
      {
        userId: registeredUser.id,
        body: registeredUser.id satisfies IDiscussionBoardRegisteredUserSession.ICreate,
      },
    );
  });
}
