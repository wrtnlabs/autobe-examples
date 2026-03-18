import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformGuest";
import type { IHrmPlatformGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformGuestSession";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test retrieving a specific guest session's detailed information after successful guest authentication.
 *
 * **Test Flow:**
 * 1. Register a new guest account using device fingerprint via POST /hrmPlatform/auth/guest/join
 * 2. Capture the session ID from the authentication response
 * 3. Retrieve the specific session details using GET /hrmPlatform/guest/sessions/{sessionId}
 * 4. Validate the response contains all required session fields
 *
 * **Validation Points:**
 * - Response includes valid session ID matching the requested ID
 * - Access token and refresh token are present and non-empty
 * - Connection metadata (IP address, href, referrer) is captured
 * - Timestamps (created_at, expired_at) are valid ISO 8601 date-time formats
 * - expired_at is in the future relative to created_at
 * - Member relation is included with profile information (id, email, display_name, avatar_url, phone_number, created_at)
 * - All required fields from IHrmPlatformMemberSession schema are present
 *
 * **Business Logic:**
 * - Guest can successfully retrieve their own session details
 * - Session data reflects the authentication state established during guest join
 * - Connection metadata accurately captures the client context at session creation time
 */
export async function test_api_guest_session_retrieve_own_session(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register guest account and establish authentication session
  const guestAuth = await authorize_guest_join(connection, {
    body: {
      device_fingerprint: RandomGenerator.alphaNumeric(32),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformGuest.IJoin,
  });
  typia.assert(guestAuth);
  // 2. Capture session ID from the authentication response
  TestValidator.predicate(
    "guest has at least one session",
    () => guestAuth.sessions.length > 0,
  );
  const sessionId = guestAuth.sessions[0]!.id;
  // 3. Create new connection with guest token for session retrieval
  const guestConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${guestAuth.token.access}`,
    },
  };
  // 4. Retrieve the specific session details
  const session = await api.functional.hrmPlatform.guest.sessions.at(
    guestConnection,
    {
      sessionId: sessionId,
    },
  );
  typia.assert(session);
  // 5. Validate session ID matches the requested ID
  TestValidator.equals("session ID matches", session.id, sessionId);
  // 6. Validate expired_at is in the future relative to created_at (business logic)
  TestValidator.predicate("expired_at is after created_at", () => {
    const created = new Date(session.created_at).getTime();
    const expired = new Date(session.expired_at).getTime();
    return expired > created;
  });
  // 7. Validate member relation is included with correct ID
  TestValidator.equals(
    "member ID matches guest ID",
    session.member.id,
    guestAuth.id,
  );
}
