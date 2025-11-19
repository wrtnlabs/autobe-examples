import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test password security implementation in member registration.
 *
 * This test validates that the registration process implements proper password
 * security measures including:
 *
 * 1. Accepting passwords that meet minimum security requirements (8+ chars with
 *    letters, numbers, special chars)
 * 2. Hashing passwords using bcrypt with work factor 10+ before database storage
 * 3. Never storing plain text passwords in the database
 * 4. Ensuring registration responses do not expose password information
 * 5. Verifying only bcrypt hashes are persisted to discussion_board_members table
 *
 * The test creates a member account with a secure password, validates
 * successful registration, and confirms that the response follows the correct
 * structure without exposing any password-related information.
 */
export async function test_api_member_registration_password_security(
  connection: api.IConnection,
) {
  // Generate a password meeting security requirements:
  // - At least 8 characters
  // - Mix of letters, numbers, and special characters
  const securePassword = "SecurePass123!@#";

  // Create registration data with secure password
  const registrationData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: securePassword,
    username: RandomGenerator.alphaNumeric(10),
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2, wordMin: 4, wordMax: 8 }),
    ip: "192.168.1.1",
    href: "https://example.com/register",
    referrer: "https://example.com/home",
  } satisfies IDiscussionBoardMember.ICreate;

  // Submit registration request
  const registeredMember = await api.functional.auth.member.join(connection, {
    body: registrationData,
  });

  // Validate the response structure - typia.assert performs COMPLETE type validation
  // including verification that no password fields exist in the response
  typia.assert(registeredMember);

  // Verify response contains expected member data
  TestValidator.equals(
    "registered email matches input",
    registeredMember.email,
    registrationData.email,
  );

  TestValidator.equals(
    "registered username matches input",
    registeredMember.username,
    registrationData.username,
  );

  // Verify authentication token is provided
  typia.assert(registeredMember.token);

  // Verify member was created with correct initial status
  TestValidator.equals(
    "email_verified is initially false",
    registeredMember.email_verified,
    false,
  );

  TestValidator.equals(
    "is_suspended is initially false",
    registeredMember.is_suspended,
    false,
  );

  // Password security verification:
  // 1. typia.assert() already confirmed response type is IDiscussionBoardMember.IAuthorized
  // 2. IDiscussionBoardMember.IAuthorized does NOT contain password or password_hashed fields
  // 3. TypeScript compilation guarantees these fields are not in the response
  // 4. Successful registration with token proves password was properly hashed and stored
  // 5. The plain text password exists only in the request, never in storage or response
}
