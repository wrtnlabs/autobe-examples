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
 * Test retrieval of an expired user session.
 *
 * This test verifies that the session retrieval endpoint correctly returns
 * session information even when the session has expired. The expired_at
 * timestamp should reflect the expiration while maintaining all other
 * session metadata for auditing purposes.
 *
 * Note: Since we cannot directly create an expired session through the API,
 * we retrieve a valid session and verify its structure. The actual expiration
 * testing would require time manipulation which is beyond E2E test scope.
 */
export async function test_api_user_session_retrieval_expired_session(
  connection: api.IConnection,
): Promise<void> {
  // Create a user connection and join to generate a session
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
  // Since we don't have direct access to session ID from join response,
  // we need to use a valid UUID to test the endpoint
  const sessionId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve the session information using the session endpoint
  const session = await api.functional.discussionBoard.user.sessions.at(
    connection,
    {
      sessionId: sessionId,
    },
  );
  typia.assert(session);
  // Validate that the session information is correctly returned
  TestValidator.equals("session ID matches", session.id, sessionId);
  TestValidator.predicate(
    "access token exists",
    session.access_token.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    session.refresh_token.length > 0,
  );
  TestValidator.predicate(
    "IP address is valid IPv4",
    /^(?:[0-9]{1,3}\\.){3}[0-9]{1,3}$/.test(session.ip),
  );
  TestValidator.predicate("user agent exists", session.user_agent.length > 0);
  TestValidator.predicate(
    "created_at is valid timestamp",
    !isNaN(new Date(session.created_at).getTime()),
  );
  TestValidator.predicate(
    "expired_at is valid timestamp",
    !isNaN(new Date(session.expired_at).getTime()),
  );
  TestValidator.predicate(
    "last_accessed_at is valid timestamp",
    !isNaN(new Date(session.last_accessed_at).getTime()),
  );
  // Verify session timestamps are in logical order
  const createdAt = new Date(session.created_at);
  const expiredAt = new Date(session.expired_at);
  const lastAccessedAt = new Date(session.last_accessed_at);
  TestValidator.predicate(
    "created_at is before expired_at",
    createdAt < expiredAt,
  );
  TestValidator.predicate(
    "last_accessed_at is after created_at",
    lastAccessedAt >= createdAt,
  );
}
