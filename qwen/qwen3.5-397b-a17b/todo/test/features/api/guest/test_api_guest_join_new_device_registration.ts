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
 * Test guest account creation with new device fingerprint registration.
 *
 * This test verifies the primary success path for guest authentication:
 * 1. Submit unique device fingerprint with session context metadata
 * 2. Verify guest account is created with proper timestamps
 * 3. Verify session record contains connection metadata
 * 4. Validate JWT authorization tokens are returned
 * 5. Confirm guest account is active (deleted_at is null)
 */
export async function test_api_guest_join_new_device_registration(
  connection: api.IConnection,
): Promise<void> {
  // Create guest connection and perform guest join
  const guestConnection: api.IConnection = { host: connection.host };
  // Generate unique device fingerprint and session metadata
  const deviceFingerprint = RandomGenerator.alphaNumeric(16);
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  const ip = typia.random<string & tags.Format<"ipv4">>();
  // Perform guest join using utility function
  const authorized = await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: deviceFingerprint,
      href: href,
      referrer: referrer,
      ip: ip,
    } satisfies ITodoAppGuest.IJoin,
  });
  // Validate complete response structure (includes UUID, date-time formats, all constraints)
  typia.assert(authorized);
  // Validate business logic: device fingerprint matches input
  TestValidator.equals(
    "device fingerprint matches",
    authorized.device_fingerprint,
    deviceFingerprint,
  );
  // Validate business logic: guest account is active (not soft-deleted)
  TestValidator.equals("guest account is active", authorized.deleted_at, null);
  // Validate business logic: sessions array contains at least one session
  TestValidator.predicate(
    "has at least one session",
    authorized.sessions.length >= 1,
  );
  // Validate session metadata matches input
  const session = authorized.sessions[0]!;
  TestValidator.equals("session ip matches", session.ip, ip);
  TestValidator.equals("session href matches", session.href, href);
  TestValidator.equals("session referrer matches", session.referrer, referrer);
  // Verify guest connection has authorization header set for subsequent requests
  TestValidator.predicate(
    "guest connection has authorization header",
    guestConnection.headers?.Authorization !== undefined,
  );
}
