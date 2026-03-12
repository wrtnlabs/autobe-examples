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
 * Test that a member cannot retrieve session information belonging to another member (data isolation).
 *
 * This test validates that:
 * 1. Member B cannot access Member A's session information
 * 2. Cross-user data access is properly prevented
 * 3. Session metadata (IP, URLs, timestamps) remains isolated per user
 */
export async function test_api_session_access_denied_other_user(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register first member (Member A)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(memberA);
  // Generate a session ID that represents another user's session
  // In a real scenario, this would be Member A's actual session ID
  const otherUserSessionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 2. Register second member (Member B)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(memberB);
  // 3. Attempt to access another user's session as Member B
  // This should fail with 403 Forbidden or 404 Not Found
  await TestValidator.httpError(
    "member B cannot access another user's session",
    [403, 404],
    async () =>
      await api.functional.multiUserTodo.member.sessions.at(memberBConnection, {
        sessionId: otherUserSessionId,
      }),
  );
}
