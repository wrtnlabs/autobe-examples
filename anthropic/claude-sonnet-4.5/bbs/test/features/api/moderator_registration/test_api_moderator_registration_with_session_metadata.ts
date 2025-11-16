import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test moderator registration with session metadata capture.
 *
 * This test validates that the moderator registration endpoint properly accepts
 * and processes session metadata (IP address, page URL, referrer URL) for audit
 * and security purposes. The system must record connection context during
 * account creation to maintain an audit trail of registration circumstances.
 *
 * Test Steps:
 *
 * 1. Prepare moderator registration data with valid credentials (email, password,
 *    username)
 * 2. Include session metadata: client IP (optional), registration page URL,
 *    referrer URL
 * 3. Call the moderator join endpoint with complete registration data
 * 4. Validate successful account creation with proper response structure
 * 5. Verify that the system accepts and processes all session metadata fields
 *
 * Validations:
 *
 * - Registration succeeds with all required and optional fields
 * - Response contains valid moderator account (validated by typia.assert)
 * - Email and username match the registration input
 * - Session metadata fields (ip, href, referrer) are accepted without errors
 */
export async function test_api_moderator_registration_with_session_metadata(
  connection: api.IConnection,
) {
  // Prepare registration data with session metadata
  const registrationData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.name(1),
    ip: typia.random<string>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  // Register moderator with session metadata
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: registrationData,
    });

  // Validate response structure - this validates EVERYTHING about types
  typia.assert(moderator);

  // Validate business logic - email and username match registration input
  TestValidator.equals(
    "moderator email matches registration",
    moderator.email,
    registrationData.email,
  );

  TestValidator.equals(
    "moderator username matches registration",
    moderator.username,
    registrationData.username,
  );
}
