import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";

/**
 * Test member registration with valid credentials.
 *
 * This test validates the complete member registration workflow including
 * account creation, JWT token issuance, and proper initialization of member
 * data. The test ensures that valid registration credentials result in a
 * successful account creation with all required fields properly initialized.
 *
 * Steps:
 *
 * 1. Generate valid registration credentials (username, email, password)
 * 2. Submit registration request to the API
 * 3. Verify account creation with proper data initialization
 * 4. Validate JWT token issuance and automatic authentication
 * 5. Confirm all profile fields are correctly populated
 */
export async function test_api_member_registration_with_valid_credentials(
  connection: api.IConnection,
) {
  // Step 1: Generate valid registration credentials
  const registrationData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecureP@ss123",
  } satisfies IRedditLikeMember.ICreate;

  // Step 2: Call the registration API
  const registeredMember: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: registrationData,
    });

  // Step 3: Validate the response structure and data
  typia.assert(registeredMember);

  // Step 4: Verify member profile data
  TestValidator.equals(
    "username matches registration input",
    registeredMember.username,
    registrationData.username,
  );

  TestValidator.equals(
    "email matches registration input",
    registeredMember.email,
    registrationData.email,
  );

  TestValidator.equals(
    "email_verified is initially false",
    registeredMember.email_verified,
    false,
  );

  TestValidator.equals(
    "post_karma is initialized to zero",
    registeredMember.post_karma,
    0,
  );

  TestValidator.equals(
    "comment_karma is initialized to zero",
    registeredMember.comment_karma,
    0,
  );

  // Step 5: Validate JWT token structure
  typia.assert(registeredMember.token);

  TestValidator.predicate(
    "access token is a non-empty string",
    registeredMember.token.access.length > 0,
  );

  TestValidator.predicate(
    "refresh token is a non-empty string",
    registeredMember.token.refresh.length > 0,
  );

  // Step 6: Verify token expiration timestamps are valid ISO date-time strings
  typia.assert<string & tags.Format<"date-time">>(
    registeredMember.token.expired_at,
  );
  typia.assert<string & tags.Format<"date-time">>(
    registeredMember.token.refreshable_until,
  );

  // Step 7: Validate that expiration dates are in the future
  const expiredAt = new Date(registeredMember.token.expired_at);
  const refreshableUntil = new Date(registeredMember.token.refreshable_until);
  const now = new Date();

  TestValidator.predicate(
    "access token expiration is in the future",
    expiredAt > now,
  );

  TestValidator.predicate(
    "refresh token expiration is in the future",
    refreshableUntil > now,
  );

  // Step 8: Verify refresh token has longer expiration than access token
  TestValidator.predicate(
    "refresh token expires after access token",
    refreshableUntil > expiredAt,
  );

  // Step 9: Verify member ID is a valid UUID
  typia.assert<string & tags.Format<"uuid">>(registeredMember.id);
}
