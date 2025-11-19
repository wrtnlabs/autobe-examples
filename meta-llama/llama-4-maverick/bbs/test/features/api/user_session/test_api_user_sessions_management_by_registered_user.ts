import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import type { IDiscussionBoardRegisteredUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUserSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardRegisteredUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardRegisteredUserSession";

export async function test_api_user_sessions_management_by_registered_user(
  connection: api.IConnection,
) {
  // Create a new registered user
  const registeredUserEmail = typia.random<string & tags.Format<"email">>();
  const registeredUser = await api.functional.auth.registered_user.join(
    connection,
    {
      body: registeredUserEmail,
    },
  );
  typia.assert(registeredUser);

  // Register the user in the discussion board
  await api.functional.discussionBoard.registeredUsers.create(connection, {
    body: registeredUserEmail,
  });

  // Get the user's sessions with various filters and pagination
  const requestBody: IDiscussionBoardRegisteredUserSession.IRequest = {
    limit: 10,
    page: 1,
    sortBy: "created_at",
    order: "desc",
    status: "active",
  };

  const sessions =
    await api.functional.discussionBoard.registeredUser.registeredUsers.sessions.index(
      connection,
      {
        userId: registeredUser.id,
        body: requestBody,
      },
    );
  typia.assert(sessions);

  // Validate the sessions response
  TestValidator.equals("sessions count", sessions.data.length, 1);
  TestValidator.equals(
    "session user ID",
    sessions.data[0].registered_user_id,
    registeredUser.id,
  );
  TestValidator.predicate("has pagination info", !!sessions.pagination);
  TestValidator.equals("current page", sessions.pagination.current, 1);
  TestValidator.predicate(
    "records count matches data length",
    sessions.pagination.records === sessions.data.length,
  );
}
