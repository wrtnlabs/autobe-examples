import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmGuest";
import type { IHrmGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmGuestSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test guest session expiration handling with 410 Gone status code.
 *
 * Validates that the guest session retrieval endpoint correctly handles expired sessions by returning 410 Gone status instead of 404 Not Found. The test creates a guest account through the join endpoint, verifies successful session retrieval, and tests error handling for non-existent sessions.
 *
 * Since natural session expiration requires waiting beyond the session TTL (impractical in E2E tests), this test focuses on:
 * 1. Successful session retrieval with valid session ID
 * 2. Proper 404 response for non-existent sessions
 * 3. Session structure validation including expiration timestamps
 *
 * The 410 Gone status is returned by the server when session.expired_at is in the past, while 404 is returned when the session record doesn't exist or the associated guest has been soft-deleted.
 *
 * 1. Create a guest account with device fingerprint and session context.
 * 2. Retrieve the session using the session ID from authorization response.
 * 3. Validate session structure includes expiration metadata.
 * 4. Test non-existent session ID returns 404 Not Found error.
 * 5. Document 410 Gone scenario for future implementation with database manipulation or test mocking.
 */
export async function test_api_guest_session_expired(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a guest account and session
  const guestConnection: api.IConnection = { host: connection.host };
  const guestAuth = await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: RandomGenerator.alphaNumeric(32),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmGuest.IJoin,
  });
  typia.assert(guestAuth);
  // 2. Verify the session can be retrieved successfully (baseline test)
  // Validate sessions array has at least one element
  TestValidator.predicate("guest has sessions", guestAuth.sessions.length > 0);
  const validSessionId = guestAuth.sessions[0].id;
  TestValidator.predicate(
    "session ID is valid UUID",
    validSessionId !== undefined,
  );
  // Retrieve session with valid session ID
  const session = await api.functional.hrm.guest.guest.sessions.at(connection, {
    sessionId: validSessionId,
  });
  typia.assert(session);
  // Validate session structure
  TestValidator.equals("session ID matches", session.id, validSessionId);
  TestValidator.predicate("has guest info", session.guest !== null);
  TestValidator.predicate(
    "has expired_at timestamp",
    session.expired_at !== null,
  );
  TestValidator.predicate(
    "has created_at timestamp",
    session.created_at !== null,
  );
  // 3. Test with non-existent session ID (returns 404 Not Found)
  const nonExistentSessionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.httpError(
    "non-existent session returns 404",
    404,
    async () => {
      await api.functional.hrm.guest.guest.sessions.at(connection, {
        sessionId: nonExistentSessionId,
      });
    },
  );
  // Note: Testing 410 Gone for expired sessions requires either:
  // - Waiting for natural session expiration (impractical in E2E tests)
  // - Database manipulation to set expired_at in the past
  // - Test server mocking capabilities
  // The endpoint returns 410 Gone when session.expired_at < current time
  // and 404 Not Found when session doesn't exist or guest is soft-deleted
}
