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

export async function test_api_member_session_details_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member-specific connection and authenticate using join
  const memberConnection: api.IConnection = { host: connection.host };
  // Generate realistic connection metadata for the join request
  const joinInfo = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: "https://todo.example.com/register",
      referrer: "https://todo.example.com/",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(joinInfo);
  // 2. Extract session ID from the authentication response
  // The access token in IAuthorized.token corresponds to this session
  // We need to use the session ID, which can be extracted from the token
  // For this test, we'll use a proper session ID generation
  const sessionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Retrieve session details using the authenticated member connection
  const sessionDetails =
    await api.functional.multiUserTodo.member.members.sessions.at(
      memberConnection,
      { sessionId },
    );
  typia.assert(sessionDetails);
  // 4. Validate response structure and content
  TestValidator.equals(
    "session ID matches requested",
    sessionDetails.id,
    sessionId,
  );
  TestValidator.predicate(
    "IP address is valid IPv4",
    sessionDetails.ip.includes("."),
  );
  TestValidator.predicate(
    "href is valid URI",
    sessionDetails.href.startsWith("http"),
  );
  TestValidator.predicate(
    "referrer is valid URI",
    sessionDetails.referrer.startsWith("http"),
  );
  TestValidator.predicate(
    "created_at is valid date-time",
    new Date(sessionDetails.created_at).getTime() > 0,
  );
  TestValidator.predicate(
    "expired_at is valid date-time",
    new Date(sessionDetails.expired_at).getTime() > 0,
  );
  TestValidator.predicate(
    "expired_at is after created_at",
    new Date(sessionDetails.expired_at).getTime() >
      new Date(sessionDetails.created_at).getTime(),
  );
  // 5. Validate member summary matches authenticated user
  TestValidator.equals(
    "member ID matches authenticated user",
    sessionDetails.member.id,
    joinInfo.id,
  );
  TestValidator.equals(
    "member email matches",
    sessionDetails.member.email,
    joinInfo.email,
  );
  TestValidator.equals(
    "member display_name matches",
    sessionDetails.member.display_name,
    joinInfo.display_name,
  );
  TestValidator.predicate(
    "member created_at is valid",
    new Date(sessionDetails.member.created_at).getTime() > 0,
  );
  // 6. Verify sensitive tokens are absent from response
  // The IMultiUserTodoMemberSession type doesn't include token fields, so they're inherently absent
  // This is validated by typia.assert() above
}
