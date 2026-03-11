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
 * Test session privacy enforcement where members cannot access other members' session details.
 * 1. Create two separate member accounts using join operations
 * 2. Attempt to retrieve session details of Member B using Member A's authentication
 * 3. Verify that the system rejects the request with 403 Forbidden error
 */
export async function test_api_member_session_privacy_enforcement(
  connection: api.IConnection,
): Promise<void> {
  // Create first member account and connection
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAAuthorized = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(memberAAuthorized);
  // Create second member account and connection
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBAuthorized = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(memberBAuthorized);
  // Member B can access their own session (valid use case)
  const memberBSession =
    await api.functional.multiUserTodo.member.members.sessions.at(
      memberBConnection,
      {
        sessionId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(memberBSession);
  // Member A attempts to access Member B's session - should be rejected
  await TestValidator.httpError(
    "member cannot access other member's session",
    403,
    async () => {
      await api.functional.multiUserTodo.member.members.sessions.at(
        memberAConnection,
        {
          sessionId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
