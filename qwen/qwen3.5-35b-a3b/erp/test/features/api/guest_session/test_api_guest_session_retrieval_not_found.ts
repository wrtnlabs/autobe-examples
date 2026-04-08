import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformGuest";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test retrieval of a session that does not exist.
 *
 * Validates that the system properly handles requests for non-existent sessions by returning
 * an appropriate 404 error response without exposing sensitive data. This test ensures users
 * cannot enumerate valid session IDs by attempting to access sessions that don't exist in
 * the system.
 *
 * Special attention is given to verifying that the error response is appropriate and that
 * no sensitive data is exposed even when the session does not exist.
 *
 * 1. Guest user registers and authenticates using POST /hrmPlatform/auth/guest/join.
 * 2. Generate a random UUID that does not correspond to any existing session.
 * 3. Call GET /hrmPlatform/guest/sessions/{sessionId} with the non-existent UUID.
 * 4. Verify the system returns HTTP 404 Not Found error.
 * 5. Verify no sensitive data is exposed in the error response.
 */
export async function test_api_guest_session_retrieval_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register guest user and authenticate
  const guestConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_guest_join(guestConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authResult);
  // 2. Generate a random UUID that does not correspond to any existing session
  const nonExistentSessionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3 & 4. Attempt to retrieve the non-existent session and verify 404 error
  await TestValidator.httpError(
    "non-existent session returns 404",
    [404],
    async () => {
      await api.functional.hrmPlatform.guest.sessions.at(guestConnection, {
        sessionId: nonExistentSessionId,
      });
    },
  );
}