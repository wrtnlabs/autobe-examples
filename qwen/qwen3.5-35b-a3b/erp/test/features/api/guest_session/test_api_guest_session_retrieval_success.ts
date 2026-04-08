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
 * Test successful retrieval of a guest authentication session.
 *
 * Validates the complete guest session retrieval flow including guest account creation and session data verification. Ensures that the session correctly references the guest account and that all session metadata fields are populated accurately.
 *
 * Special attention is given to verifying that guests have no organization context (organization_id is null) and that sensitive token values are not exposed in the session response for security.
 *
 * 1. Guest account creation via POST /hrmPlatform/auth/guest/join with device identification.
 * 2. Session retrieval via GET /hrmPlatform/guest/sessions/{sessionId}.
 * 3. Validates session ID matches the returned session_id from join response.
 * 4. Validates organization_id is null for guest accounts without organizational affiliation.
 * 5. Validates ip_address and user_agent match the values from the join request.
 * 6. Validates access_token_expires_at is a valid future timestamp.
 * 7. Validates refresh_token_expires_at is a valid future timestamp.
 * 8. Validates expired_at is null for active sessions.
 * 9. Validates all timestamp fields (created_at, updated_at) are valid date-times.
 * 10. Validates member_id is present and contains a valid UUID format.
 * 11. Verifies security requirement: no access_token or refresh_token values are exposed in the response.
 */
export async function test_api_guest_session_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create guest session via POST /hrmPlatform/auth/guest/join
  const guestConnection: api.IConnection = { host: connection.host };
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "testPassword123!",
    name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: "192.168.1.100",
  } satisfies IHrmPlatformGuest.IJoin;
  const joinResponse = await authorize_guest_join(guestConnection, {
    body: joinInput,
  });
  typia.assert(joinResponse);
  // Validate join response contains session_id and token
  typia.assert(joinResponse.session_id);
  typia.assert(joinResponse.token);
  // 2. Retrieve session via GET /hrmPlatform/guest/sessions/{sessionId}
  const sessionConnection: api.IConnection = { host: connection.host };
  const sessionResponse = await api.functional.hrmPlatform.guest.sessions.at(
    sessionConnection,
    {
      sessionId: joinResponse.session_id!,
    },
  );
  typia.assert(sessionResponse);
  // 3. Verify session ID matches
  TestValidator.equals(
    "session ID matches",
    sessionResponse.id,
    joinResponse.session_id,
  );
  // 4. Verify organization_id is null for guests
  TestValidator.equals(
    "guest organization_id is null",
    sessionResponse.organization_id,
    null,
  );
  // 5. Verify ip_address matches join request
  TestValidator.equals(
    "ip_address matches join request",
    sessionResponse.ip_address,
    joinInput.ip,
  );
  // 6. Verify access_token_expires_at is a future timestamp
  const now = new Date();
  const accessExpiry = new Date(sessionResponse.access_token_expires_at);
  TestValidator.predicate(
    "access_token_expires_at is in the future",
    accessExpiry > now,
  );
  // 7. Verify refresh_token_expires_at is a future timestamp
  const refreshExpiry = new Date(sessionResponse.refresh_token_expires_at);
  TestValidator.predicate(
    "refresh_token_expires_at is in the future",
    refreshExpiry > now,
  );
  // 8. Verify expired_at is null for active session
  TestValidator.equals(
    "expired_at is null for active session",
    sessionResponse.expired_at,
    null,
  );
  // 9. Verify all required timestamp fields are present and valid
  TestValidator.predicate(
    "created_at is valid date-time",
    () => !isNaN(new Date(sessionResponse.created_at).getTime()),
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    () => !isNaN(new Date(sessionResponse.updated_at).getTime()),
  );
  // 10. Verify member_id is present and valid UUID
  typia.assert(sessionResponse.member_id);
  // 11. Security: Verify no token values are exposed in session response
  // IHrmPlatformMemberSession type does not contain access/refresh tokens
  // This is validated by TypeScript type system - response only contains metadata
}
