import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test guest session retrieval with non-existent session ID.
 *
 * Validates error handling when an authenticated guest attempts to retrieve a session that does not exist in the system. After successful guest authentication, the test calls GET /todoApp/guest/sessions/{sessionId} with a valid UUID format that doesn't correspond to any existing session.
 *
 * This test ensures the endpoint properly validates session existence and returns appropriate error responses for non-existent resources. The guest authentication context is established first, then a random UUID (guaranteed to not exist) is used to query the session endpoint.
 *
 * 1. Guest authenticates using device fingerprint to establish valid session context.
 * 2. Guest attempts to retrieve a session using a randomly generated UUID that doesn't exist.
 * 3. System returns 404 error indicating the session was not found.
 * 4. Validates that error handling works correctly for non-existent resources within authenticated scope.
 */
export async function test_api_guest_session_not_found_invalid_id(
  connection: api.IConnection,
): Promise<void> {
  // 1. Guest authentication
  const guestConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: RandomGenerator.alphaNumeric(32),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppGuest.IJoin,
  });
  typia.assert(authResult);
  // 2. Set authorization header from auth result
  guestConnection.headers = {
    Authorization: `Bearer ${authResult.token.access}`,
  };
  // 3. Attempt to retrieve non-existent session
  const nonExistentSessionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 4. Validate that requesting non-existent session returns 404 error
  await TestValidator.httpError("session not found", 404, async () => {
    await api.functional.todoApp.guest.sessions.at(guestConnection, {
      sessionId: nonExistentSessionId,
    });
  });
}
