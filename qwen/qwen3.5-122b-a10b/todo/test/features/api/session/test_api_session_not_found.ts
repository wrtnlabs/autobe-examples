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
 * Test member session retrieval with non-existent session ID.
 *
 * This test verifies that when a member attempts to retrieve a session
 * that does not exist in the system, the API returns HTTP 404 Not Found
 * status. The test uses a valid UUID format that was never created in
 * the system to ensure proper error handling for non-existent resources.
 *
 * Steps:
 * 1. Authenticate as member using authorize_member_join
 * 2. Generate a valid UUID that doesn't exist in the system
 * 3. Attempt to retrieve the non-existent session
 * 4. Verify HTTP 404 error is thrown
 */
export async function test_api_session_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(auth);
  // 2. Generate a valid UUID that doesn't exist in the system
  const nonExistentSessionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Attempt to retrieve the non-existent session and verify 404 error
  await TestValidator.httpError(
    "session not found returns 404",
    404,
    async () => {
      await api.functional.todoApp.member.sessions.at(memberConnection, {
        sessionId: nonExistentSessionId,
      });
    },
  );
}
