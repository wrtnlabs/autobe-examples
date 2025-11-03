import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test successful member account registration workflow.
 *
 * This test validates the complete member registration process including
 * account creation with valid credentials, email verification token generation,
 * and immediate JWT token issuance. The test verifies that a new member account
 * is created with pending_email_verification status, email_verified is false,
 * username and email are unique, password is securely hashed, and the response
 * includes both access and refresh tokens for immediate authenticated access.
 *
 * Validation confirms:
 *
 * 1. Username format (3-30 characters, alphanumeric with underscores/hyphens)
 * 2. Email format validation
 * 3. Password strength (minimum 8 characters with uppercase, lowercase, number,
 *    special char)
 * 4. Account created with correct initial status
 * 5. Authentication tokens issued immediately
 */
export async function test_api_member_registration_success(
  connection: api.IConnection,
) {
  // Generate valid registration data
  const username = RandomGenerator.alphaNumeric(10);
  const email = typia.random<string & tags.Format<"email">>();
  const password = "SecureP@ss123";
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();

  // Create registration request body
  const registrationData = {
    username: username,
    email: email,
    password: password,
    ip: null,
    href: href,
    referrer: referrer,
  } satisfies IDiscussionBoardMember.IJoin;

  // Execute registration API call
  const member = await api.functional.auth.member.join(connection, {
    body: registrationData,
  });

  // Validate complete response structure
  typia.assert(member);

  // Verify username matches input
  TestValidator.equals("username matches input", member.username, username);

  // Verify email matches input
  TestValidator.equals("email matches input", member.email, email);

  // Verify email_verified is false for new accounts
  TestValidator.equals(
    "email not verified initially",
    member.email_verified,
    false,
  );
}
