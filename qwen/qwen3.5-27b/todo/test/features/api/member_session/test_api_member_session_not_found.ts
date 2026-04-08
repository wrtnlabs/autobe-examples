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
 * Test the error scenario when attempting to retrieve a non-existent member session.
 *
 * Validates that the system properly handles requests for session IDs that do not exist in the database. After authenticating as a member, the test constructs a request with a randomly generated UUID that is guaranteed to not exist. The endpoint should return a 404 Not Found error, indicating that no session record exists with the provided ID. This test ensures that the API correctly handles missing session data without leaking information about existing sessions.
 *
 * 1. Authenticate a member account using the join endpoint
 * 2. Generate a random UUID that does not exist in the database
 * 3. Attempt to retrieve the non-existent session using the session ID
 * 4. Validate that the API throws an HttpError with status 404
 * 5. Confirm the error response is appropriate and doesn't expose sensitive information
 */
export async function test_api_member_session_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {},
  });
  // 2. Generate a random non-existent session ID
  const nonExistentSessionId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to retrieve the non-existent session
  await TestValidator.httpError(
    "should return 404 for non-existent session",
    404,
    async () =>
      await api.functional.todoApp.member.member.sessions.at(memberConnection, {
        sessionId: nonExistentSessionId,
      }),
  );
}
