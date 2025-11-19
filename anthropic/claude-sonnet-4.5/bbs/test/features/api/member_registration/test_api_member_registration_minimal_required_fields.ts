import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test successful member registration with only required fields.
 *
 * This test validates that the member registration API correctly handles
 * requests containing only the required fields (email, password, username,
 * href, referrer) while omitting optional fields (display_name, bio, ip).
 *
 * The test verifies the following behaviors:
 *
 * 1. Registration completes successfully with minimal required data
 * 2. Display_name defaults to the username value when not provided
 * 3. Bio defaults to null when not provided
 * 4. JWT tokens are generated and returned
 * 5. Initial account status is set correctly (email_verified=false,
 *    is_suspended=false)
 */
export async function test_api_member_registration_minimal_required_fields(
  connection: api.IConnection,
) {
  // Generate random username (3-30 characters as per MinLength/MaxLength constraints)
  const username = RandomGenerator.alphaNumeric(
    typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<3> & tags.Maximum<30>
    >(),
  );

  // Create registration data with only required fields
  const registrationData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    username: username,
    display_name: null,
    bio: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.ICreate;

  // Call registration API
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: registrationData,
    });

  // Validate response structure
  typia.assert(member);

  // Verify display_name defaults to username when not provided
  TestValidator.equals(
    "display_name should default to username",
    member.display_name,
    username,
  );

  // Verify bio defaults to null when not provided
  TestValidator.equals(
    "bio should be null when not provided",
    member.bio,
    null,
  );

  // Verify email matches the registration email
  TestValidator.equals(
    "email should match registration data",
    member.email,
    registrationData.email,
  );

  // Verify username matches
  TestValidator.equals(
    "username should match registration data",
    member.username,
    username,
  );

  // Verify JWT tokens are present
  TestValidator.predicate(
    "access token should be present",
    member.token.access.length > 0,
  );

  TestValidator.predicate(
    "refresh token should be present",
    member.token.refresh.length > 0,
  );

  // Verify initial account status
  TestValidator.equals(
    "email_verified should be false initially",
    member.email_verified,
    false,
  );

  TestValidator.equals(
    "is_suspended should be false initially",
    member.is_suspended,
    false,
  );
}
