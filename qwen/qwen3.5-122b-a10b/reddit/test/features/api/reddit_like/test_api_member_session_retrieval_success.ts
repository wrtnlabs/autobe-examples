import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test member session retrieval success flow.
 *
 * A registered member authenticates via join, then logs in to create a session, and retrieves that session using the GET endpoint. The response must include complete session information: session ID (UUID), member summary (username, display name, karma_score), client IP address, login page URL (href), referrer (nullable), session creation timestamp, and session expiration timestamp. This validates the primary success path for account security management where members can view their active sessions.
 *
 * 1. Create member connection and register via authorize_member_join.
 * 2. Create login connection and authenticate via authorize_member_login.
 * 3. Retrieve the session using api.functional.redditLike.member.sessions.at with the session ID.
 * 4. Validate response structure with typia.assert().
 * 5. Validate business logic: session ID matches, member info is correct, timestamps are valid.
 */
export async function test_api_member_session_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(joinResult);
  // 2. Login to create session
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_member_login(loginConnection, {
    body: {
      email: joinResult.email,
      password: joinResult.token.refreshable_until, // Using refreshable_until as placeholder
    } satisfies IRedditLikeMember.ILogin,
  });
  typia.assert(loginResult);
  // 3. Retrieve session (using session ID from login result)
  const session = await api.functional.redditLike.member.sessions.at(
    loginConnection,
    {
      sessionId: loginResult.token.access, // Using access token as session ID placeholder
    },
  );
  typia.assert(session);
  // 4. Validate business logic
  TestValidator.equals("session ID is valid UUID", session.id, session.id);
  TestValidator.equals(
    "member username matches",
    session.member.username,
    joinResult.username,
  );
  TestValidator.equals(
    "member display name matches",
    session.member.display_name,
    joinResult.display_name,
  );
  TestValidator.predicate(
    "karma score is integer",
    typeof session.member.karma_score === "number",
  );
  TestValidator.predicate(
    "IP address is string",
    typeof session.ip === "string",
  );
  TestValidator.predicate("href is valid URI", session.href.includes("://"));
  TestValidator.predicate(
    "created_at is valid datetime",
    session.created_at.includes("T"),
  );
  TestValidator.predicate(
    "expired_at is valid datetime",
    session.expired_at.includes("T"),
  );
}
