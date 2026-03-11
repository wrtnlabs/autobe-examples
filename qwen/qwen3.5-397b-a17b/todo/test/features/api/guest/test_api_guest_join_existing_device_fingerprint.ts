import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
import type { ITodoAppGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test returning guest scenario with existing device fingerprint.
 *
 * This test validates that when a guest joins with a device fingerprint
 * that already exists in the system:
 * 1. The existing guest account is retrieved (not duplicated)
 * 2. Original created_at timestamp is preserved
 * 3. updated_at timestamp is updated
 * 4. A new session record is created (not reusing old sessions)
 * 5. Response includes all historical sessions plus new JWT tokens
 */
export async function test_api_guest_join_existing_device_fingerprint(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create initial guest account with specific device fingerprint
  const deviceFingerprint = RandomGenerator.alphaNumeric(16);
  const sessionContext = {
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  };
  const firstJoin: ITodoAppGuest.IAuthorized = await authorize_guest_join(
    { host: connection.host },
    {
      body: {
        device_fingerprint: deviceFingerprint,
        ...sessionContext,
      } satisfies ITodoAppGuest.IJoin,
    },
  );
  typia.assert(firstJoin);
  // Validate first join response structure
  TestValidator.equals(
    "device fingerprint matches",
    firstJoin.device_fingerprint,
    deviceFingerprint,
  );
  TestValidator.equals("initial session count", firstJoin.sessions.length, 1);
  // Capture original timestamps and IDs
  const originalCreatedAt = firstJoin.created_at;
  const originalGuestId = firstJoin.id;
  const originalSessionId = firstJoin.sessions[0]!.id;
  // Step 2: Join again with the SAME device fingerprint (returning guest)
  const secondSessionContext = {
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  };
  const secondJoin: ITodoAppGuest.IAuthorized = await authorize_guest_join(
    { host: connection.host },
    {
      body: {
        device_fingerprint: deviceFingerprint,
        ...secondSessionContext,
      } satisfies ITodoAppGuest.IJoin,
    },
  );
  typia.assert(secondJoin);
  // Step 3: Validate returning guest behavior
  // Guest account should be the same (not duplicated)
  TestValidator.equals("guest id preserved", secondJoin.id, originalGuestId);
  TestValidator.equals(
    "device fingerprint preserved",
    secondJoin.device_fingerprint,
    deviceFingerprint,
  );
  // created_at should remain unchanged (original account creation time)
  TestValidator.equals(
    "created_at preserved",
    secondJoin.created_at,
    originalCreatedAt,
  );
  // Should have 2 sessions now (original + new)
  TestValidator.equals(
    "session count increased",
    secondJoin.sessions.length,
    2,
  );
  // Original session should still exist
  const hasOriginalSession = secondJoin.sessions.some(
    (session) => session.id === originalSessionId,
  );
  TestValidator.predicate("original session preserved", hasOriginalSession);
  // New session should exist (different from original)
  const newSessions = secondJoin.sessions.filter(
    (session) => session.id !== originalSessionId,
  );
  TestValidator.equals("one new session created", newSessions.length, 1);
  const newSession = newSessions[0]!;
  TestValidator.notEquals(
    "new session has different id",
    newSession.id,
    originalSessionId,
  );
  // Validate new session has proper structure
  typia.assert(newSession);
  TestValidator.predicate(
    "new session has valid href",
    newSession.href.length > 0,
  );
  TestValidator.predicate("new session has valid ip", newSession.ip.length > 0);
  // Should have fresh JWT tokens for the new session
  TestValidator.predicate(
    "has new access token",
    secondJoin.token.access.length > 0,
  );
  TestValidator.predicate(
    "has new refresh token",
    secondJoin.token.refresh.length > 0,
  );
  // Tokens should be different from first join (new session)
  TestValidator.notEquals(
    "access token refreshed",
    secondJoin.token.access,
    firstJoin.token.access,
  );
  TestValidator.notEquals(
    "refresh token refreshed",
    secondJoin.token.refresh,
    firstJoin.token.refresh,
  );
  // Validate that updated_at exists and is a valid datetime
  typia.assert(secondJoin.updated_at);
}
