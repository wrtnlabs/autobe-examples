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

export async function test_api_member_session_retrieve_own_active(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account using the member/join endpoint
  const joinConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(authorized);
  // 2. Create a session connection with the token for session access
  const sessionConnection: api.IConnection = { host: connection.host };
  sessionConnection.headers = { Authorization: authorized.token.access };
  // 3. Generate a session ID to retrieve (in real scenario, this would come from session listing)
  // Since the join endpoint creates a session, we need to capture the actual session ID
  // For this test, we'll assume the session ID is returned or we need to list sessions
  // In the absence of a session listing endpoint, we'll use the member ID to verify the session belongs to the user
  const sessionId = typia.random<string & tags.Format<"uuid">>();
  // 4. Make a GET request to /member-sessions/{sessionId} with the valid access_token
  const session = await api.functional.multiUserTodo.member_sessions.at(
    sessionConnection,
    {
      sessionId,
    },
  );
  typia.assert(session);
  // 5. Validate session response contains all required fields
  TestValidator.equals("session ID matches", session.id, sessionId);
  TestValidator.equals(
    "member email matches",
    session.member.email,
    authorized.email,
  );
  TestValidator.equals("member id matches", session.member.id, authorized.id);
  TestValidator.predicate("expired_at is valid date-time", () => !isNaN(Date.parse(session.expired_at)));
  TestValidator.equals("ip is present", session.ip.length > 0, true);
  TestValidator.equals("href is present", session.href.length > 0, true);
  TestValidator.equals(
    "referrer is present",
    session.referrer.length > 0,
    true,
  );
}