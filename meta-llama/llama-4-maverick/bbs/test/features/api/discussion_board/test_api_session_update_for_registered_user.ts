import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import type { IDiscussionBoardRegisteredUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUserSession";

export async function test_api_session_update_for_registered_user(
  connection: api.IConnection,
) {
  const registeredUser = await api.functional.auth.registered_user.join(
    connection,
    {
      body: typia.random<IDiscussionBoardRegisteredUser.ICreate>(),
    },
  );
  typia.assert(registeredUser);

  const session =
    await api.functional.discussionBoard.registeredUser.registeredUsers.sessions.create(
      connection,
      {
        userId: registeredUser.id,
        body: typia.random<IDiscussionBoardRegisteredUserSession.ICreate>(),
      },
    );
  typia.assert(session);

  const updatedSession =
    await api.functional.discussionBoard.registeredUser.registeredUsers.sessions.update(
      connection,
      {
        userId: registeredUser.id,
        sessionId: session.id,
        body: typia.random<IDiscussionBoardRegisteredUserSession.IUpdate>(),
      },
    );
  typia.assert(updatedSession);

  TestValidator.equals(
    "session updated successfully",
    updatedSession.id,
    session.id,
  );
}
