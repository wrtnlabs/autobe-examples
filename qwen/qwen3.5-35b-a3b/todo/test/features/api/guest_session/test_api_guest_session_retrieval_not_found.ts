import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoGuest";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IMultiUserTodoMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test retrieval of a non-existent guest session returns appropriate error.
 *
 * Validates that attempting to retrieve a session with an invalid UUID returns
 * a proper 404 Not Found error without exposing information about whether the
 * session belongs to another user or exists at all. This security behavior
 * ensures the system handles missing resources safely.
 *
 * Special attention is given to verifying that non-existent sessions are handled
 * securely without leaking information about session ownership or existence.
 *
 * 1. Guest authenticates by joining with valid email and password.
 * 2. Invalid session UUID is generated that does not exist in the system.
 * 3. GET request is made to retrieve the non-existent session.
 * 4. Validates HTTP 404 response is returned for non-existent session ID.
 */
export async function test_api_guest_session_retrieval_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as guest
  const guestConnection: api.IConnection = { host: connection.host };
  await authorize_guest_join(guestConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IMultiUserTodoGuest.IJoin,
  });
  // 2. Generate invalid session ID that does not exist
  const invalidSessionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Attempt to retrieve non-existent session
  await TestValidator.httpError(
    "non-existent session should return 404",
    404,
    async () => {
      await api.functional.multiUserTodo.guest.sessions.at(guestConnection, {
        sessionId: invalidSessionId,
      });
    },
  );
}
