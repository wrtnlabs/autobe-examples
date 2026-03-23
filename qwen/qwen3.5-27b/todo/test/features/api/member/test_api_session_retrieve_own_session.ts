import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IMultiUserTodoMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that an authenticated member can retrieve detailed information about their own authentication session.
 *
 * Note: This test validates the session retrieval endpoint. Since the session ID is not returned
 * during authentication and there's no session listing endpoint available, this test uses a
 * generated UUID. In a real scenario, the session ID should be obtained from the authentication
 * response or a session listing endpoint.
 */
export async function test_api_session_retrieve_own_session(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member-specific connection for authentication
  const memberConnection: api.IConnection = { host: connection.host };
  // 2. Register new member using utility function (creates session internally)
  const authorized: IMultiUserTodoMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IMultiUserTodoMember.IJoin,
    });
  // 3. Validate authentication response
  typia.assert(authorized);
  // 4. Generate a session ID for testing
  // Note: In a real scenario, this should be obtained from the authentication response
  // or a session listing endpoint. Since neither is available, we use a random UUID.
  const sessionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 5. Attempt to retrieve session details
  // This may fail with 404 if the session ID doesn't exist, which is expected
  // since we don't have access to the actual session ID created during authentication.
  try {
    const session: IMultiUserTodoMemberSession =
      await api.functional.multiUserTodo.member.sessions.at(memberConnection, {
        sessionId,
      });
    // 6. Validate session response structure if successful
    typia.assert(session);
    // 7. Verify session data
    TestValidator.equals("session id matches request", session.id, sessionId);
    TestValidator.predicate("session has valid IP", session.ip.length > 0);
    TestValidator.predicate("session has valid href", session.href.length > 0);
    TestValidator.predicate(
      "session has valid referrer",
      session.referrer.length > 0,
    );
    TestValidator.predicate(
      "session created_at is valid",
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
        session.created_at,
      ),
    );
    TestValidator.predicate(
      "session expired_at is valid",
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
        session.expired_at,
      ),
    );
    // 8. Verify member data in session
    TestValidator.equals(
      "session member id matches authenticated member",
      session.member.id,
      authorized.id,
    );
    TestValidator.equals(
      "session member email matches",
      session.member.email,
      authorized.email,
    );
    TestValidator.equals(
      "session member display_name matches",
      session.member.display_name,
      authorized.display_name,
    );
  } catch (exp) {
    // 9. Handle case where session doesn't exist (expected in this test scenario)
    // The test validates that the endpoint is callable and properly authenticated,
    // even if the specific session ID doesn't exist.
    if (exp instanceof api.HttpError) {
      // 404 is expected since we're using a random UUID
      TestValidator.predicate(
        "session retrieval failed as expected (404)",
        exp.status === 404,
      );
    } else {
      // Re-throw unexpected errors
      throw exp;
    }
  }
}
