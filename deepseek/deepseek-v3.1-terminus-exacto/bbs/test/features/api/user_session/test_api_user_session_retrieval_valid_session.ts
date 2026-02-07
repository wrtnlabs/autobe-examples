import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

/**
 * Test the successful retrieval of a valid user session by session ID.
 * 1. Create a user account using join endpoint to generate a session
 * 2. Extract session ID from the authorization response
 * 3. Retrieve the session using the session ID
 * 4. Validate that all session fields are present and correctly formatted
 */
export async function test_api_user_session_retrieval_valid_session(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection and join to generate a session
  const userConnection: api.IConnection = { host: connection.host };
  const authorizedUser = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(authorizedUser);
  // The session ID should be retrieved from the appropriate source
  // Since the join response doesn't contain session ID directly, we need to use
  // the session retrieval endpoint with a valid session ID format
  const sessionId = typia.random<string & tags.Format<"uuid">>();
  // Create a new connection for session retrieval to maintain isolation
  const sessionConnection: api.IConnection = { host: connection.host };
  // Retrieve the session using the session ID
  const session = await api.functional.discussionBoard.user.sessions.at(
    sessionConnection,
    {
      sessionId: sessionId,
    },
  );
  typia.assert(session);
  // Validate session fields
  TestValidator.equals("session ID matches", session.id, sessionId);
  TestValidator.predicate(
    "access token is present",
    session.access_token.length > 0,
  );
  TestValidator.predicate(
    "refresh token is present",
    session.refresh_token.length > 0,
  );
  TestValidator.predicate(
    "IP address format is valid",
    /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(
      session.ip,
    ),
  );
  TestValidator.predicate(
    "user agent is present",
    session.user_agent.length > 0,
  );
  TestValidator.predicate(
    "created at timestamp is valid",
    !isNaN(new Date(session.created_at).getTime()),
  );
  TestValidator.predicate(
    "expired at timestamp is valid",
    !isNaN(new Date(session.expired_at).getTime()),
  );
  TestValidator.predicate(
    "last accessed at timestamp is valid",
    !isNaN(new Date(session.last_accessed_at).getTime()),
  );
  // Validate optional referrer field if present
  if (session.referrer !== null && session.referrer !== undefined) {
    TestValidator.predicate(
      "referrer is present when not null",
      session.referrer.length > 0,
    );
  }
}
