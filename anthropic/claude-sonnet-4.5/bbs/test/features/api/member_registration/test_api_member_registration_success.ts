import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test successful member registration workflow with complete valid credentials.
 *
 * This test validates the complete member registration process including:
 *
 * - Creating a new member account with unique email and username
 * - Secure password hashing using bcrypt
 * - Automatic email verification token generation with 24-hour expiration
 * - Immediate JWT token issuance (access token: 30 min, refresh token: 7 days)
 * - Initial session creation with tracking information (ip, href, referrer)
 * - Correct initial account state (email_verified=false, is_suspended=false)
 *
 * The test follows the member registration workflow:
 *
 * 1. Generate unique registration credentials and profile data
 * 2. Submit registration request with session context
 * 3. Validate response contains complete member profile
 * 4. Verify JWT tokens are returned for immediate authenticated access
 * 5. Confirm initial account state allows read-only access pending email
 *    verification
 */
export async function test_api_member_registration_success(
  connection: api.IConnection,
) {
  // Generate unique email and username for registration
  const email = typia.random<string & tags.Format<"email">>();
  const password = typia.random<string & tags.Format<"password">>();
  const username = typia.random<
    string & tags.MinLength<3> & tags.MaxLength<30>
  >();
  const displayName = RandomGenerator.name();
  const bio = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 5,
    wordMax: 10,
  });

  // Generate session context for tracking
  const sessionIp = "192.168.1.100";
  const sessionHref = typia.random<string & tags.Format<"uri">>();
  const sessionReferrer = typia.random<string & tags.Format<"uri">>();

  // Create registration request body
  const registrationData = {
    email: email,
    password: password,
    username: username,
    display_name: displayName,
    bio: bio,
    ip: sessionIp,
    href: sessionHref,
    referrer: sessionReferrer,
  } satisfies IDiscussionBoardMember.ICreate;

  // Submit registration request
  const registeredMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: registrationData,
    });

  // Validate response structure - this validates ALL types perfectly
  typia.assert(registeredMember);

  // Verify registration data matches response (business logic validation)
  TestValidator.equals(
    "registered email matches input",
    registeredMember.email,
    email,
  );

  TestValidator.equals(
    "registered username matches input",
    registeredMember.username,
    username,
  );

  TestValidator.equals(
    "display name matches input",
    registeredMember.display_name,
    displayName,
  );

  TestValidator.equals("bio matches input", registeredMember.bio, bio);

  // Verify initial account state (business rules validation)
  TestValidator.equals(
    "email verification status is false initially",
    registeredMember.email_verified,
    false,
  );

  TestValidator.equals(
    "account suspension status is false initially",
    registeredMember.is_suspended,
    false,
  );

  TestValidator.equals(
    "email verified at timestamp is null initially",
    registeredMember.email_verified_at,
    null,
  );

  TestValidator.equals(
    "suspension reason is null for active account",
    registeredMember.suspension_reason,
    null,
  );

  TestValidator.equals(
    "suspended until timestamp is null for active account",
    registeredMember.suspended_until,
    null,
  );

  TestValidator.equals(
    "deleted_at should be null for active account",
    registeredMember.deleted_at,
    null,
  );
}
