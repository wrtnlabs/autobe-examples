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
 * Test guest registration with device fingerprint authentication.
 *
 * Validates the complete guest registration flow using device fingerprint identification. This test ensures that a new guest can successfully register by providing a device fingerprint along with session context information, and receives proper JWT tokens for authenticated API access.
 *
 * The registration process creates a guest account in hrm_guests table and a corresponding session record in hrm_guest_sessions with JWT access and refresh tokens. The access token is short-lived while the refresh token enables session renewal without re-registration.
 *
 * 1. Create guest connection with host from base connection.
 * 2. Generate random device fingerprint (32 character alphanumeric string).
 * 3. Generate random URI values for href and referrer session context.
 * 4. Generate random IPv4 address for security auditing.
 * 5. Call authorize_guest_join utility function with generated data.
 * 6. Validate response structure and all required fields.
 * 7. Verify token expiration timestamps are valid and properly ordered.
 * 8. Ensure sessions array contains session data with correct metadata.
 */
export async function test_api_guest_join_with_device_fingerprint(
  connection: api.IConnection,
): Promise<void> {
  // Create guest-specific connection
  const guestConnection: api.IConnection = { host: connection.host };
  // Generate test data
  const deviceFingerprint: string = RandomGenerator.alphaNumeric(32);
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  const ip = typia.random<string & tags.Format<"ipv4">>();
  // Register guest with device fingerprint
  const output: IHrmGuest.IAuthorized = await authorize_guest_join(
    guestConnection,
    {
      body: {
        device_fingerprint: deviceFingerprint,
        href,
        referrer,
        ip,
      } satisfies IHrmGuest.IJoin,
    },
  );
  // Validate response structure
  typia.assert(output);
  // Validate guest identification fields
  TestValidator.equals(
    "device fingerprint matches",
    output.device_fingerprint,
    deviceFingerprint,
  );
  TestValidator.predicate(
    "has valid UUID id",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      output.id,
    ),
  );
  // Validate timestamps
  TestValidator.predicate(
    "created_at is valid date-time",
    !isNaN(Date.parse(output.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    !isNaN(Date.parse(output.updated_at)),
  );
  TestValidator.predicate(
    "deleted_at is null for active guest",
    output.deleted_at === null,
  );
  // Validate token structure
  typia.assert(output.token);
  TestValidator.predicate("token has access", output.token.access.length > 0);
  TestValidator.predicate("token has refresh", output.token.refresh.length > 0);
  TestValidator.predicate(
    "expired_at is valid date-time",
    !isNaN(Date.parse(output.token.expired_at)),
  );
  TestValidator.predicate(
    "refreshable_until is valid date-time",
    !isNaN(Date.parse(output.token.refreshable_until)),
  );
  // Verify token expiration ordering
  TestValidator.predicate(
    "access token expires before refresh token",
    new Date(output.token.expired_at).getTime() <
      new Date(output.token.refreshable_until).getTime(),
  );
  // Validate sessions array
  TestValidator.predicate(
    "sessions array exists",
    Array.isArray(output.sessions),
  );
  TestValidator.predicate(
    "sessions array is not empty",
    output.sessions.length > 0,
  );
  // Validate first session
  const session = output.sessions[0];
  typia.assert(session);
  TestValidator.predicate(
    "session has valid UUID id",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      session.id,
    ),
  );
  TestValidator.predicate("session has ip", session.ip.length > 0);
  TestValidator.predicate("session has href", session.href.length > 0);
  TestValidator.predicate("session has referrer", session.referrer.length > 0);
  TestValidator.predicate(
    "session created_at is valid",
    !isNaN(Date.parse(session.created_at)),
  );
  TestValidator.predicate(
    "session expired_at is valid",
    !isNaN(Date.parse(session.expired_at)),
  );
  TestValidator.predicate(
    "session has guest reference",
    session.guest !== null && session.guest !== undefined,
  );
}
