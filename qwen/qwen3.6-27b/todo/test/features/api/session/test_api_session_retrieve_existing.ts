import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppMemberSession";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test retrieving an existing session by its unique identifier.
 *
 * Validates that an authenticated member can retrieve their session details after logging in. The test registers a new member, logs in to create a session, lists sessions to extract a valid session ID, and retrieves the full session object. Verifies that all session attributes—unique UUID, associated member summary, client IP, entry page URL, referrer source, creation timestamp, and expiration timestamp—are correctly returned.
 *
 * 1. Register a new member account.
 * 2. Log in with the member credentials, which creates a new session.
 * 3. List the member's sessions to obtain a valid session UUID.
 * 4. Retrieve the full session detail using the session ID.
 * 5. Verify session attributes match the expected data.
 * 6. Validate that the linked member summary reflects the authenticated user's identity.
 */
export async function test_api_session_retrieve_existing(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const joinHref = typia.random<string & tags.Format<"uri">>();
  const joinReferrer = typia.random<string & tags.Format<"uri">>();
  const loginHref = typia.random<string & tags.Format<"uri">>();
  const loginReferrer = typia.random<string & tags.Format<"uri">>();
  const memberPassword = RandomGenerator.alphaNumeric(16);
  const joined = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: memberPassword,
      href: joinHref,
      referrer: joinReferrer,
    },
  });
  typia.assert(joined);
  const memberEmail = joined.email;
  // 2. Log in with member credentials (creates a new session)
  const loginConnection: api.IConnection = { host: connection.host };
  const loginInput = {
    email: memberEmail,
    password: memberPassword,
    href: loginHref,
    referrer: loginReferrer,
  } satisfies ITodoAppMember.ILogin;
  const logged = await authorize_member_login(loginConnection, {
    body: loginInput,
  });
  typia.assert(logged);
  // 3. List the member's sessions to obtain a valid session ID
  const sessionsPage = await api.functional.todoApp.sessions.index(
    loginConnection,
    {
      body: {} satisfies ITodoAppMemberSession.IRequest,
    },
  );
  typia.assert(sessionsPage);
  TestValidator.predicate(
    "sessions list contains at least one session",
    sessionsPage.data.length > 0,
  );
  const sessionId = sessionsPage.data[0].id;
  // 4. Retrieve the full session detail using the session ID
  const session = await api.functional.todoApp.sessions.at(loginConnection, {
    sessionId,
  });
  typia.assert(session);
  // 5. Verify session attributes
  TestValidator.equals("session ID matches", session.id, sessionId);
  TestValidator.predicate("has valid IP address", session.ip !== "");
  TestValidator.predicate("has entry page URL (href)", session.href !== "");
  TestValidator.predicate("has creation timestamp", session.created_at !== "");
  TestValidator.predicate(
    "has expiration timestamp",
    session.expired_at !== "",
  );
  // 6. Validate linked member summary reflects authenticated user
  TestValidator.equals(
    "member ID matches authenticated user",
    session.member.id,
    logged.id,
  );
  TestValidator.equals(
    "member email matches",
    session.member.email,
    memberEmail,
  );
}
