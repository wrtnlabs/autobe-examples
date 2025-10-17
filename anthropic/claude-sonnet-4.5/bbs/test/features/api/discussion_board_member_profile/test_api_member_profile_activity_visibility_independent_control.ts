import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test member profile visibility through the public profile endpoint.
 *
 * This test validates the ability to retrieve member profiles through the GET
 * /discussionBoard/users/{userId} endpoint. While the original scenario
 * intended to test independent control of profile_visibility and
 * activity_visibility settings, the available API does not provide endpoints to
 * configure these settings during member creation or through updates.
 *
 * According to the API documentation, new members are created with default
 * values:
 *
 * - Profile_visibility: 'public'
 * - Activity_visibility: 'public'
 *
 * This test therefore validates:
 *
 * 1. Successful member account creation via /auth/member/join
 * 2. Successful profile retrieval via GET /discussionBoard/users/{userId}
 * 3. Correct profile data returned matching registration information
 * 4. Multiple members can be created and retrieved independently
 *
 * Note: Full testing of independent profile_visibility and activity_visibility
 * controls would require additional API endpoints for updating member settings,
 * which are not available in the current API specification.
 *
 * Test steps:
 *
 * 1. Create first member account with username, email, password, and display name
 * 2. Retrieve first member's profile and verify data matches registration
 * 3. Create second member account with different credentials
 * 4. Retrieve second member's profile and verify data matches registration
 * 5. Confirm both member profiles are distinct and retrievable
 */
export async function test_api_member_profile_activity_visibility_independent_control(
  connection: api.IConnection,
) {
  // Step 1: Create first member account
  const firstMemberEmail = typia.random<string & tags.Format<"email">>();
  const firstMemberPassword = typia.random<
    string & tags.MinLength<8> & tags.MaxLength<128>
  >();
  const firstMemberUsername = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<30> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">
  >();
  const firstMemberDisplayName = RandomGenerator.name();

  const firstMemberData = {
    username: firstMemberUsername,
    email: firstMemberEmail,
    password: firstMemberPassword,
    display_name: firstMemberDisplayName,
  } satisfies IDiscussionBoardMember.ICreate;

  const firstMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: firstMemberData,
    });
  typia.assert(firstMember);

  // Step 2: Retrieve first member's profile
  const firstMemberProfile: IDiscussionBoardMember.IPublic =
    await api.functional.discussionBoard.users.at(connection, {
      userId: firstMember.id,
    });
  typia.assert(firstMemberProfile);

  // Step 3: Validate first member's profile data
  TestValidator.equals(
    "first member ID matches",
    firstMemberProfile.id,
    firstMember.id,
  );
  TestValidator.equals(
    "first member username matches",
    firstMemberProfile.username,
    firstMemberUsername,
  );
  TestValidator.equals(
    "first member display name matches",
    firstMemberProfile.display_name,
    firstMemberDisplayName,
  );
  TestValidator.equals(
    "first member account status is active",
    firstMemberProfile.account_status,
    "pending_verification",
  );

  // Step 4: Create second member account
  const secondMemberEmail = typia.random<string & tags.Format<"email">>();
  const secondMemberPassword = typia.random<
    string & tags.MinLength<8> & tags.MaxLength<128>
  >();
  const secondMemberUsername = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<30> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">
  >();
  const secondMemberDisplayName = RandomGenerator.name();

  const secondMemberData = {
    username: secondMemberUsername,
    email: secondMemberEmail,
    password: secondMemberPassword,
    display_name: secondMemberDisplayName,
  } satisfies IDiscussionBoardMember.ICreate;

  const secondMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: secondMemberData,
    });
  typia.assert(secondMember);

  // Step 5: Retrieve second member's profile
  const secondMemberProfile: IDiscussionBoardMember.IPublic =
    await api.functional.discussionBoard.users.at(connection, {
      userId: secondMember.id,
    });
  typia.assert(secondMemberProfile);

  // Step 6: Validate second member's profile data
  TestValidator.equals(
    "second member ID matches",
    secondMemberProfile.id,
    secondMember.id,
  );
  TestValidator.equals(
    "second member username matches",
    secondMemberProfile.username,
    secondMemberUsername,
  );
  TestValidator.equals(
    "second member display name matches",
    secondMemberProfile.display_name,
    secondMemberDisplayName,
  );

  // Step 7: Verify both members are distinct
  TestValidator.notEquals(
    "member profiles have different IDs",
    firstMemberProfile.id,
    secondMemberProfile.id,
  );
  TestValidator.notEquals(
    "member profiles have different usernames",
    firstMemberProfile.username,
    secondMemberProfile.username,
  );
}
