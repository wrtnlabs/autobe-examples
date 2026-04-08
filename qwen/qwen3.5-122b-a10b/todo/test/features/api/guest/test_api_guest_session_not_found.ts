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
 * Validates that attempting to access a session that does not exist returns a proper 404 Not Found error. This test ensures proper error handling for invalid session IDs and prevents information leakage about session existence.
 *
 * 1. Register a guest user via /todoApp/auth/guest/join to obtain authentication.
 * 2. Call the session retrieval endpoint with an invalid or non-existent session ID (random UUID).
 * 3. Verify the system returns 404 Not Found error.
 * 4. Verify the error message indicates the session was not found.
 */
export async function test_api_guest_session_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register guest user and authenticate
  const guestConnection: api.IConnection = { host: connection.host };
  const guestAuth = await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppGuest.IJoin,
  });
  typia.assert(guestAuth);
  // 2. Attempt to retrieve non-existent session with random UUID
  const invalidSessionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Verify 404 error is thrown
  await TestValidator.httpError("session not found", 404, async () => {
    await api.functional.todoApp.guest.sessions.at(guestConnection, {
      sessionId: invalidSessionId,
    });
  });
}
