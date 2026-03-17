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
 * Test that attempting to retrieve a non-existent session returns 404 Not Found.
 *
 * This test validates that the system properly handles requests for sessions
 * that do not exist. The test ensures:
 * 1. A member can register and login successfully
 * 2. Attempting to fetch a session with a valid but non-existent UUID returns 404
 * 3. The error response properly indicates the session was not found
 *
 * This is important for security - the system should not reveal whether a
 * session exists for another user vs. not existing at all.
 */
export async function test_api_member_session_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new member account
  const password = RandomGenerator.alphaNumeric(16);
  const memberConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: password,
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(joinResult);
  // Step 2: Login to establish authentication context
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_member_login(loginConnection, {
    body: {
      email: joinResult.email,
      password: password,
    } satisfies ITodoAppMember.ILogin,
  });
  typia.assert(loginResult);
  // Step 3: Attempt to retrieve a non-existent session
  // Generate a valid UUID format that doesn't exist in the system
  const nonExistentSessionId = typia.random<string & tags.Format<"uuid">>();
  // Step 4 & 5: Validate that the response returns HTTP 404 Not Found
  await TestValidator.httpError(
    "non-existent session returns 404",
    404,
    async () => {
      await api.functional.todoApp.member.sessions.at(loginConnection, {
        sessionId: nonExistentSessionId,
      });
    },
  );
}
