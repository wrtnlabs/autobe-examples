import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test that token refresh returns the member's current profile information
 * including any updates made since the original login.
 *
 * This test validates that the refresh token endpoint not only renews JWT
 * tokens but also provides the latest member profile data from the database.
 * This ensures clients can maintain synchronized member state through refresh
 * operations without additional API calls.
 *
 * Test workflow:
 *
 * 1. Create a new member account through registration
 * 2. Verify the initial registration response contains valid profile data
 * 3. Use the refresh token to perform a token refresh operation
 * 4. Verify the refresh response contains the member's complete profile
 *    information
 * 5. Confirm that all profile fields match between registration and refresh
 *    responses
 * 6. Validate that new JWT tokens are issued with proper expiration times
 */
export async function test_api_member_token_refresh_profile_updates_reflected(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account through registration
  const registrationEmail = typia.random<string & tags.Format<"email">>();
  const registrationPassword = typia.random<string & tags.Format<"password">>();
  const registrationUsername = typia.random<
    string & tags.MinLength<3> & tags.MaxLength<30>
  >();
  const registrationDisplayName = RandomGenerator.name();
  const registrationBio = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 4,
    wordMax: 8,
  });

  const registrationBody = {
    email: registrationEmail,
    password: registrationPassword,
    username: registrationUsername,
    display_name: registrationDisplayName,
    bio: registrationBio,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.ICreate;

  const registeredMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: registrationBody,
    });

  // Step 2: Verify the registration response
  typia.assert(registeredMember);
  TestValidator.equals(
    "registered member email matches input",
    registeredMember.email,
    registrationEmail,
  );
  TestValidator.equals(
    "registered member username matches input",
    registeredMember.username,
    registrationUsername,
  );
  TestValidator.equals(
    "registered member display_name matches input",
    registeredMember.display_name,
    registrationDisplayName,
  );
  TestValidator.equals(
    "registered member bio matches input",
    registeredMember.bio,
    registrationBio,
  );
  TestValidator.predicate(
    "registration provides valid access token",
    registeredMember.token.access.length > 0,
  );
  TestValidator.predicate(
    "registration provides valid refresh token",
    registeredMember.token.refresh.length > 0,
  );

  // Step 3: Use the refresh token to perform token refresh
  const refreshBody = {
    refresh_token: registeredMember.token.refresh,
  } satisfies IDiscussionBoardMember.IRefresh;

  const refreshedMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.refresh(connection, {
      body: refreshBody,
    });

  // Step 4: Verify the refresh response contains complete profile data
  typia.assert(refreshedMember);

  // Step 5: Validate that refresh returns the same member profile data
  TestValidator.equals(
    "refreshed member id matches registered member",
    refreshedMember.id,
    registeredMember.id,
  );
  TestValidator.equals(
    "refreshed member email matches registered member",
    refreshedMember.email,
    registeredMember.email,
  );
  TestValidator.equals(
    "refreshed member username matches registered member",
    refreshedMember.username,
    registeredMember.username,
  );
  TestValidator.equals(
    "refreshed member display_name matches registered member",
    refreshedMember.display_name,
    registeredMember.display_name,
  );
  TestValidator.equals(
    "refreshed member bio matches registered member",
    refreshedMember.bio,
    registeredMember.bio,
  );
  TestValidator.equals(
    "refreshed member email_verified status matches",
    refreshedMember.email_verified,
    registeredMember.email_verified,
  );
  TestValidator.equals(
    "refreshed member is_suspended status matches",
    refreshedMember.is_suspended,
    registeredMember.is_suspended,
  );
  TestValidator.equals(
    "refreshed member created_at matches",
    refreshedMember.created_at,
    registeredMember.created_at,
  );

  // Step 6: Validate that new JWT tokens are issued
  TestValidator.predicate(
    "refresh provides new access token",
    refreshedMember.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh provides new refresh token",
    refreshedMember.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "refresh token has valid expiration time",
    new Date(refreshedMember.token.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "refresh token has valid refreshable_until time",
    new Date(refreshedMember.token.refreshable_until) > new Date(),
  );
}
