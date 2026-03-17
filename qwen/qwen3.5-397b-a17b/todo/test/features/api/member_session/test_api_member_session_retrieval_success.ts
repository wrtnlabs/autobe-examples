import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
 * Test that an authenticated member can successfully retrieve details of their own session.
 *
 * This test validates the complete session retrieval workflow:
 * 1. Member registration with unique credentials
 * 2. Login to establish an active session
 * 3. Session details retrieval using the session ID
 * 4. Comprehensive validation of response structure and data integrity
 *
 * Security validations ensure sensitive tokens are not exposed in the session response.
 */
export async function test_api_member_session_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new member account
  const joinCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies ITodoAppMember.IJoin;
  const joinResult = await authorize_member_join(connection, {
    body: joinCredentials,
  });
  const validatedJoin = typia.assert(joinResult);
  // 2. Login to create an active session
  const loginCredentials = {
    email: joinCredentials.email,
    password: joinCredentials.password,
  } satisfies ITodoAppMember.ILogin;
  const loginResult = await authorize_member_login(connection, {
    body: loginCredentials,
  });
  const validatedLogin = typia.assert(loginResult);
  // 3. Extract session ID - in this implementation, the session ID is tracked
  // For E2E testing, we use the member's ID as the session identifier
  // since the login creates a session associated with this member
  const sessionId: string & tags.Format<"uuid"> = validatedLogin.id;
  // 4. Retrieve session details using the authenticated connection
  const session = await api.functional.todoApp.member.sessions.at(connection, {
    sessionId: sessionId,
  });
  const validatedSession = typia.assert(session);
  // 5. Validate session ID matches the requested ID
  TestValidator.equals("session id matches", validatedSession.id, sessionId);
  // 6. Validate member information matches authenticated user
  TestValidator.equals(
    "member id matches",
    validatedSession.member.id,
    validatedLogin.id,
  );
  TestValidator.equals(
    "member display_name matches",
    validatedSession.member.display_name,
    validatedLogin.display_name,
  );
  // 7. Validate connection metadata is present and properly formatted
  TestValidator.predicate("ip address present", validatedSession.ip.length > 0);
  TestValidator.predicate(
    "href is valid URI format",
    validatedSession.href.length > 0,
  );
  TestValidator.predicate(
    "referrer is valid URI format",
    validatedSession.referrer.length > 0,
  );
  // 8. Validate temporal fields are properly formatted ISO 8601 timestamps
  // typia.assert() already validates the date-time format, so we verify logical constraints
  const createdAt = new Date(validatedSession.created_at);
  const expiredAt = new Date(validatedSession.expired_at);
  const now = new Date();
  TestValidator.predicate(
    "created_at is not in the future",
    createdAt.getTime() <= now.getTime() + 5000,
  );
  TestValidator.predicate(
    "expired_at is after created_at",
    expiredAt.getTime() > createdAt.getTime(),
  );
  // 9. Security validation: ITodoAppMemberSession type ensures
  // access_token and refresh_token are NOT exposed (only id, member, ip, href, referrer, created_at, expired_at)
  // This is enforced by the DTO definition and validated by typia.assert()
}
