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

export async function test_api_guest_join_session_metadata_tracking(
  connection: api.IConnection,
): Promise<void> {
  // 1. Prepare guest session metadata with all connection context fields
  const deviceFingerprint = RandomGenerator.alphaNumeric(16);
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  const ip = typia.random<string & tags.Format<"ipv4">>();
  // 2. Create guest connection and join with complete metadata
  const guestConnection: api.IConnection = { host: connection.host };
  const guest = await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: deviceFingerprint,
      href: href,
      referrer: referrer,
      ip: ip,
    } satisfies ITodoAppGuest.IJoin,
  });
  // 3. Validate response structure (validates all types, formats, and constraints)
  typia.assert(guest);
  // 4. Verify guest account properties match input
  TestValidator.equals(
    "device fingerprint matches",
    guest.device_fingerprint,
    deviceFingerprint,
  );
  // 5. Verify session metadata is stored accurately
  TestValidator.predicate(
    "has at least one session",
    guest.sessions.length >= 1,
  );
  const session = guest.sessions[guest.sessions.length - 1];
  typia.assert(session);
  TestValidator.equals("session IP matches submitted", session.ip, ip);
  TestValidator.equals("session href matches submitted", session.href, href);
  TestValidator.equals(
    "session referrer matches submitted",
    session.referrer,
    referrer,
  );
  // 6. Validate session expiration (guest sessions should be shorter than member sessions)
  const sessionDuration =
    Date.parse(session.expired_at) - Date.parse(session.created_at);
  const expectedMaxGuestSessionHours = 24; // Guest sessions typically shorter than member sessions
  TestValidator.predicate(
    "session expiration within guest policy",
    sessionDuration <= expectedMaxGuestSessionHours * 60 * 60 * 1000,
  );
  TestValidator.predicate(
    "session expires in future",
    Date.parse(session.expired_at) > Date.now(),
  );
  // 7. Validate JWT token structure and expiration ordering
  TestValidator.predicate(
    "access token is non-empty string",
    guest.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty string",
    guest.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "access token expires before refresh deadline",
    Date.parse(guest.token.expired_at) <=
      Date.parse(guest.token.refreshable_until),
  );
  // 8. Verify guest-to-member transition pathway (guest ID maintained for linkage)
  TestValidator.predicate(
    "guest ID available for account linkage",
    guest.id.length > 0,
  );
  // 9. Verify connection is authenticated (token set in headers)
  TestValidator.predicate(
    "guest connection has authorization header",
    guestConnection.headers?.Authorization !== undefined,
  );
  TestValidator.equals(
    "authorization header uses access token",
    guestConnection.headers?.Authorization,
    `Bearer ${guest.token.access}`,
  );
}
