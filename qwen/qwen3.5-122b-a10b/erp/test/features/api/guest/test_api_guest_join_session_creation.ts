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
 * Test guest registration with session creation and token generation.
 *
 * Validates the complete guest registration workflow including device fingerprint identification, session record creation, and JWT token issuance. Ensures that all required data relationships are properly established and that session context information is correctly captured.
 *
 * The test verifies that guest registration creates both guest account and session records with proper foreign key relationships, generates valid access and refresh tokens, and captures session metadata including IP address, entry URL, and referrer information.
 *
 * 1. Generate random device fingerprint and session context data.
 * 2. Register guest account using device fingerprint.
 * 3. Verify guest account record contains correct device_fingerprint.
 * 4. Verify session record exists with proper foreign key relationship.
 * 5. Validate JWT tokens are present and properly formatted.
 * 6. Verify session expiration timestamps are set correctly.
 * 7. Validate session context fields (ip, href, referrer) are captured.
 */
export async function test_api_guest_join_session_creation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Prepare guest registration data with randomized values
  const guestConnection: api.IConnection = { host: connection.host };
  const output: IHrmGuest.IAuthorized = await authorize_guest_join(
    guestConnection,
    {
      body: {
        device_fingerprint: RandomGenerator.alphaNumeric(32),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IHrmGuest.IJoin,
    },
  );
  // 2. Validate response structure
  typia.assert(output);
  // 3. Verify guest account fields
  TestValidator.equals("guest ID is UUID", output.id.length, 36);
  TestValidator.predicate(
    "created_at is valid date-time",
    output.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    output.updated_at.length > 0,
  );
  // 4. Verify authorization tokens
  TestValidator.predicate(
    "access token exists",
    output.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    output.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is valid date-time",
    output.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refreshable_until is valid date-time",
    output.token.refreshable_until.length > 0,
  );
  // 5. Verify session data exists
  TestValidator.predicate("sessions array exists", output.sessions.length > 0);
  const session = output.sessions[0];
  typia.assert(session);
  // 6. Verify session record fields
  TestValidator.equals("session ID is UUID", session.id.length, 36);
  TestValidator.predicate("session IP exists", session.ip.length > 0);
  TestValidator.predicate("session href exists", session.href.length > 0);
  TestValidator.predicate(
    "session created_at is valid",
    session.created_at.length > 0,
  );
  TestValidator.predicate(
    "session expired_at is valid",
    session.expired_at.length > 0,
  );
  // Referrer can be null per DTO definition, so validate accordingly
  TestValidator.predicate(
    "session referrer is valid (null or string)",
    session.referrer === null || session.referrer.length > 0,
  );
  // 7. Verify guest relationship in session
  TestValidator.equals("guest ID matches", session.guest.id, output.id);
  TestValidator.equals(
    "guest device fingerprint matches",
    session.guest.device_fingerprint,
    output.device_fingerprint,
  );
  TestValidator.predicate(
    "guest created_at is valid",
    session.guest.created_at.length > 0,
  );
  TestValidator.predicate(
    "sessions_count is at least 1",
    session.guest.sessions_count >= 1,
  );
}
