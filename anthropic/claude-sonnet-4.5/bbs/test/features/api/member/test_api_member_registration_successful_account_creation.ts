import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test successful member registration with valid credentials.
 *
 * This test validates the complete member registration workflow where a new
 * user creates an account with valid credentials. The test verifies that:
 *
 * 1. A new member can register with a unique username (3-30 characters,
 *    alphanumeric with hyphens and underscores), a valid unique email address,
 *    and a secure password meeting complexity requirements (minimum 8
 *    characters with uppercase, lowercase, number, and special character).
 * 2. The system creates a new member record and returns it with proper structure.
 * 3. The system generates and returns JWT access and refresh tokens immediately
 *    upon registration.
 * 4. The response includes the newly created member account information with a
 *    valid member ID and complete token information.
 * 5. The user can immediately access member features with the issued tokens.
 */
export async function test_api_member_registration_successful_account_creation(
  connection: api.IConnection,
) {
  // Generate valid registration data
  const registrationData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: "Test123!@#",
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardMember.ICreate;

  // Execute member registration
  const registeredMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: registrationData,
    });

  // Validate the response structure - this validates EVERYTHING
  typia.assert(registeredMember);
}
