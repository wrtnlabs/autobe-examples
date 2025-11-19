import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test member registration with optional fields (display_name and bio).
 *
 * This test validates the complete registration workflow when a new member
 * provides all optional fields including display_name and bio. It ensures that
 * optional fields are properly stored and that display_name can contain spaces
 * and special characters unlike the username field.
 *
 * Test Steps:
 *
 * 1. Generate valid registration data including all required fields
 * 2. Add optional display_name with spaces and special characters
 * 3. Add optional bio content within the 500 character limit
 * 4. Submit registration request to the API
 * 5. Validate response structure and authentication tokens
 * 6. Verify display_name is stored correctly with special characters
 * 7. Verify bio content is stored properly
 * 8. Confirm all profile fields are returned in the response
 */
export async function test_api_member_registration_with_optional_fields(
  connection: api.IConnection,
) {
  // Generate display name with spaces and special characters
  const displayName = `${RandomGenerator.name(2)} (${RandomGenerator.name(1)}).`;

  // Generate bio within 500 character limit
  const bioContent = RandomGenerator.paragraph({
    sentences: 10,
    wordMin: 3,
    wordMax: 7,
  });

  // Generate registration data with all optional fields
  const registrationData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    username: typia.random<string & tags.MinLength<3> & tags.MaxLength<30>>(),
    display_name: displayName,
    bio: bioContent,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.ICreate;

  // Call registration API
  const registeredMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: registrationData,
    });

  // Validate response structure
  typia.assert(registeredMember);

  // Verify basic registration fields
  TestValidator.equals(
    "email matches",
    registeredMember.email,
    registrationData.email,
  );
  TestValidator.equals(
    "username matches",
    registeredMember.username,
    registrationData.username,
  );

  // Verify optional display_name is stored correctly
  TestValidator.equals(
    "display_name is stored",
    registeredMember.display_name,
    registrationData.display_name,
  );
  TestValidator.predicate(
    "display_name contains spaces and special characters",
    registeredMember.display_name !== null &&
      registeredMember.display_name !== undefined &&
      registeredMember.display_name.includes(" ") &&
      /[().]/.test(registeredMember.display_name),
  );

  // Verify optional bio is stored correctly
  TestValidator.equals(
    "bio is stored",
    registeredMember.bio,
    registrationData.bio,
  );
  TestValidator.predicate(
    "bio is within character limit",
    registeredMember.bio !== null &&
      registeredMember.bio !== undefined &&
      registeredMember.bio.length <= 500,
  );

  // Verify authentication tokens are present
  TestValidator.predicate(
    "access token exists",
    registeredMember.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    registeredMember.token.refresh.length > 0,
  );

  // Verify initial account status
  TestValidator.equals(
    "email not verified initially",
    registeredMember.email_verified,
    false,
  );
  TestValidator.equals(
    "account not suspended",
    registeredMember.is_suspended,
    false,
  );

  // Verify timestamps are present
  TestValidator.predicate(
    "created_at timestamp exists",
    registeredMember.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at timestamp exists",
    registeredMember.updated_at.length > 0,
  );
}
