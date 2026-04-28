import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformGuest";
import type { IEcommercePlatformGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformGuestSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test guest session details retrieval after guest account registration.
 *
 * Validates the complete end-to-end workflow of guest session creation followed by retrieval. A new guest account is registered using a device fingerprint through the guest join endpoint, which establishes an initial session and returns an authorized response containing the guest identifier. This identifier is then used to query the guest session retrieval endpoint to obtain the complete session details.
 *
 * The test ensures that session state persistence works correctly and that all session metadata fields are accurately populated. The session UUID matches the requested ID, the client IP address is recorded, the request href and referrer URLs are captured, and both creation and expiration timestamps are present. The nested guest account summary includes the matching device fingerprint and account creation timestamp, verifying accurate data mapping between the join response and the detailed session record.
 *
 * 1. Guest registers with device fingerprint, href, referrer, and optional IP address.
 * 2. Guest session is retrieved using the guest ID as the session identifier.
 * 3. Validates session ID matches the requested session identifier.
 * 4. Validates guest summary device fingerprint matches the input fingerprint.
 * 5. Validates guest summary ID matches the guest account ID.
 */
export async function test_api_guest_session_details_retrieval(
  connection: api.IConnection,
) {
  // 1. Guest registration with device fingerprint
  const guestConnection: api.IConnection = { host: connection.host };
  const deviceFingerprint: string = RandomGenerator.alphaNumeric(32);
  const href: string = typia.random<string & tags.Format<"uri">>();
  const referrer: string = typia.random<string & tags.Format<"uri">>();
  const authorized = await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: deviceFingerprint,
      href,
      referrer,
    },
  });
  typia.assert(authorized);
  // 2. Retrieve guest session using the guest ID as session identifier
  const session: IEcommercePlatformGuestSession =
    await api.functional.ecommercePlatform.guest.sessions.at(guestConnection, {
      sessionId: authorized.id,
    });
  typia.assert(session);
  // 3. Validate session ID matches the requested session identifier
  TestValidator.equals("session id matches", session.id, authorized.id);
  // 4. Validate guest summary device fingerprint matches the input fingerprint
  TestValidator.equals(
    "guest device fingerprint matches",
    session.guest.device_fingerprint,
    deviceFingerprint,
  );
  // 5. Validate guest summary ID matches the guest account ID
  TestValidator.equals("guest id matches", session.guest.id, authorized.id);
}
