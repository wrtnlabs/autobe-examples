import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import type { IDiscussionBoardRegisteredUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUserSession";

export async function test_api_session_creation_for_registered_user(
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

  TestValidator.equals("session user ID", session.userId, registeredUser.id);
  TestValidator.predicate(
    "session status is active",
    session.status === "active",
  );
  TestValidator.predicate("session has valid createdAt", !!session.createdAt);
  TestValidator.predicate(
    "session has valid lastActivity",
    !!session.lastActivity,
  );
}
