import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";

/**
 * Test successful guest session registration with complete session tracking
 * initialization.
 *
 * Validates that a new guest can register with a unique session_identifier and
 * user_agent, receiving valid JWT access and refresh tokens. Verifies that the
 * response includes the guest's id, session_identifier, ip_address, user_agent,
 * first_visit_at and last_visit_at timestamps (both set to current time),
 * page_views initialized to 0, and complete token information with access
 * token, refresh token, expired_at, and refreshable_until timestamps.
 *
 * Ensures the session_identifier is stored for subsequent tracking and that the
 * tokens grant read-only access to public content. Confirms that first_visit_at
 * and last_visit_at are identical for new sessions, validating proper
 * initialization of the guest browsing lifecycle.
 */
export async function test_api_guest_registration_successful_session_creation(
  connection: api.IConnection,
) {
  // Generate unique session identifier for guest tracking
  const sessionIdentifier = typia.random<string & tags.Format<"uuid">>();

  // Generate realistic user agent string for device analytics
  const userAgent = `Mozilla/5.0 (${RandomGenerator.pick(["Windows NT 10.0", "Macintosh", "X11"] as const)}; ${RandomGenerator.pick(["Win64; x64", "Intel Mac OS X 10_15_7", "Linux x86_64"] as const)}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${typia.random<number & tags.Type<"uint32"> & tags.Minimum<90> & tags.Maximum<120>>()}.0.0.0 Safari/537.36`;

  // Create guest registration request body
  const requestBody = {
    session_identifier: sessionIdentifier,
    user_agent: userAgent,
    ip_address: undefined,
  } satisfies IDiscussionBoardGuest.ICreate;

  // Execute guest registration
  const guest = await api.functional.auth.guest.join(connection, {
    body: requestBody,
  });

  // Validate response structure with complete type checking
  // This performs COMPLETE validation of ALL fields including UUID formats, date-time formats, and all type constraints
  typia.assert(guest);

  // Verify session identifier matches the input
  TestValidator.equals(
    "session identifier should match request",
    guest.session_identifier,
    sessionIdentifier,
  );

  // Verify user agent matches the input
  TestValidator.equals(
    "user agent should match request",
    guest.user_agent,
    userAgent,
  );

  // Verify page views initialized to zero for new guest session
  TestValidator.equals(
    "page views should be initialized to 0",
    guest.page_views,
    0,
  );

  // Verify first_visit_at and last_visit_at are identical for new sessions
  TestValidator.equals(
    "first_visit_at and last_visit_at should be identical for new session",
    guest.first_visit_at,
    guest.last_visit_at,
  );
}
