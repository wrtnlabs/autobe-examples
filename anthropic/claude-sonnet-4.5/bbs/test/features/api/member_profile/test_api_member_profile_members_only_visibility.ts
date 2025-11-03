import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test that authenticated members can access other member profiles.
 *
 * This test validates that the profile retrieval API works correctly for
 * authenticated members. Since the API does not provide a way to set
 * profile_visibility during registration or through updates, this test verifies
 * that authenticated members can successfully retrieve profile information of
 * other members regardless of the default visibility setting.
 *
 * Test workflow:
 *
 * 1. Create first member account
 * 2. Create second member account to act as authenticated viewer
 * 3. Use second member's authentication to retrieve first member's profile
 * 4. Verify that the profile is successfully returned with correct data
 * 5. Validate that all profile fields are properly populated
 */
export async function test_api_member_profile_members_only_visibility(
  connection: api.IConnection,
) {
  // Step 1: Create first member account
  const firstMemberUsername = RandomGenerator.alphaNumeric(8);
  const firstMemberEmail = `${RandomGenerator.alphaNumeric(10)}@test.com`;
  const firstMemberPassword = RandomGenerator.alphaNumeric(12) + "Aa1!";

  const firstMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: firstMemberUsername,
        email: firstMemberEmail,
        password: firstMemberPassword,
        ip: "192.168.1.100",
        href: "https://test.example.com/join",
        referrer: "https://test.example.com/home",
      } satisfies IDiscussionBoardMember.IJoin,
    });
  typia.assert(firstMember);

  // Verify first member was created correctly
  TestValidator.equals(
    "first member username matches",
    firstMember.username,
    firstMemberUsername,
  );
  TestValidator.equals(
    "first member email matches",
    firstMember.email,
    firstMemberEmail,
  );

  // Step 2: Create second member to test authenticated access
  const secondMemberUsername = RandomGenerator.alphaNumeric(8);
  const secondMemberEmail = `${RandomGenerator.alphaNumeric(10)}@test.com`;
  const secondMemberPassword = RandomGenerator.alphaNumeric(12) + "Aa1!";

  const secondMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: secondMemberUsername,
        email: secondMemberEmail,
        password: secondMemberPassword,
        ip: "192.168.1.101",
        href: "https://test.example.com/join",
        referrer: "https://test.example.com/home",
      } satisfies IDiscussionBoardMember.IJoin,
    });
  typia.assert(secondMember);

  // Verify second member was created
  TestValidator.equals(
    "second member username matches",
    secondMember.username,
    secondMemberUsername,
  );

  // Step 3: Use second member's authentication to retrieve first member's profile
  const retrievedProfile: IDiscussionBoardMember =
    await api.functional.discussionBoard.members.at(connection, {
      memberUsername: firstMemberUsername,
    });
  typia.assert(retrievedProfile);

  // Step 4: Verify the retrieved profile data matches first member
  TestValidator.equals(
    "retrieved profile username matches first member",
    retrievedProfile.username,
    firstMemberUsername,
  );
  TestValidator.equals(
    "retrieved profile email matches first member",
    retrievedProfile.email,
    firstMemberEmail,
  );
  TestValidator.equals(
    "retrieved profile id matches first member",
    retrievedProfile.id,
    firstMember.id,
  );

  // Step 5: Verify profile_visibility field exists and has a valid value
  TestValidator.predicate(
    "profile_visibility is defined",
    typeof retrievedProfile.profile_visibility === "string" &&
      retrievedProfile.profile_visibility.length > 0,
  );
}
