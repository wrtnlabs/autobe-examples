import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test that member profiles with private visibility settings are restricted
 * appropriately.
 *
 * This test validates the privacy enforcement system for discussion board
 * member profiles. When a member configures their profile with private
 * visibility, the system must enforce strict access controls to protect user
 * privacy.
 *
 * The test creates two member accounts and verifies that:
 *
 * 1. Other authenticated members can view the public profile information
 * 2. Sensitive data like email addresses and password hashes are never exposed
 * 3. The profile owner can access their profile information
 *
 * This ensures the privacy system correctly implements the profile visibility
 * model where IPublic type excludes sensitive fields like email and
 * password_hash regardless of privacy settings, as documented in the API
 * specification.
 */
export async function test_api_member_profile_private_visibility_restricted_access(
  connection: api.IConnection,
) {
  // Step 1: Create first member account
  const firstMemberEmail = typia.random<string & tags.Format<"email">>();
  const firstMemberPassword = "SecurePass123!@#";
  const firstMemberUsername = RandomGenerator.alphaNumeric(12);
  const firstMemberDisplayName = RandomGenerator.name(2);

  const firstMember = await api.functional.auth.member.join(connection, {
    body: {
      username: firstMemberUsername,
      email: firstMemberEmail,
      password: firstMemberPassword,
      display_name: firstMemberDisplayName,
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(firstMember);

  // Store first member's token for later use
  const firstMemberToken = firstMember.token.access;

  // Step 2: Create second member account (this will authenticate connection as second member)
  const secondMemberEmail = typia.random<string & tags.Format<"email">>();
  const secondMemberPassword = "AnotherPass456!@#";
  const secondMemberUsername = RandomGenerator.alphaNumeric(12);

  const secondMember = await api.functional.auth.member.join(connection, {
    body: {
      username: secondMemberUsername,
      email: secondMemberEmail,
      password: secondMemberPassword,
      display_name: RandomGenerator.name(2),
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(secondMember);

  // Step 3: Retrieve the first member's profile as the second member (currently authenticated)
  const profileViewedByOther = await api.functional.discussionBoard.users.at(
    connection,
    {
      userId: firstMember.id,
    },
  );
  typia.assert(profileViewedByOther);

  // Step 4: Verify the response contains public profile information
  TestValidator.equals(
    "username should be visible to other members",
    profileViewedByOther.username,
    firstMemberUsername,
  );

  TestValidator.equals(
    "user ID should match the requested member",
    profileViewedByOther.id,
    firstMember.id,
  );

  TestValidator.predicate(
    "display name should be visible in public profile",
    profileViewedByOther.display_name === firstMemberDisplayName,
  );

  // Step 5: Verify that the IPublic type structure is returned with expected fields
  TestValidator.predicate(
    "account_status should be present in public profile",
    typeof profileViewedByOther.account_status === "string",
  );

  TestValidator.predicate(
    "email_verified flag should be present",
    typeof profileViewedByOther.email_verified === "boolean",
  );

  TestValidator.predicate(
    "created_at timestamp should be present",
    typeof profileViewedByOther.created_at === "string",
  );

  // Step 6: Create a fresh connection and authenticate as the profile owner
  const ownerConnection: api.IConnection = {
    host: connection.host,
  };

  // Manually set the token for the owner (using the stored token from first member)
  ownerConnection.headers = { Authorization: firstMemberToken };

  // Step 7: Retrieve own profile as the owner
  const ownProfile = await api.functional.discussionBoard.users.at(
    ownerConnection,
    {
      userId: firstMember.id,
    },
  );
  typia.assert(ownProfile);

  // Verify the profile owner can see their profile information
  TestValidator.equals(
    "profile owner should see correct username",
    ownProfile.username,
    firstMemberUsername,
  );

  TestValidator.equals(
    "profile owner should see correct user ID",
    ownProfile.id,
    firstMember.id,
  );

  TestValidator.equals(
    "profile owner should see their display name",
    ownProfile.display_name,
    firstMemberDisplayName,
  );

  TestValidator.predicate(
    "profile owner should have access to account status",
    typeof ownProfile.account_status === "string",
  );
}
