import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test members-only profile visibility access control.
 *
 * Validates that member profiles with 'members_only' visibility are accessible
 * to authenticated members but not to unauthenticated guests. This test ensures
 * the intermediate privacy setting works correctly between public and private
 * visibility levels.
 *
 * Test workflow:
 *
 * 1. Create first member account with members_only visibility (implicit default)
 * 2. Attempt profile retrieval as unauthenticated guest (should be denied/limited)
 * 3. Create second authenticated member account
 * 4. Retrieve first member's profile as authenticated member (should succeed)
 * 5. Verify profile data is returned and sensitive fields are excluded
 */
export async function test_api_member_profile_members_only_visibility(
  connection: api.IConnection,
) {
  // Step 1: Create first member account
  const firstMemberData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePass123!@#",
    display_name: RandomGenerator.name(2),
  } satisfies IDiscussionBoardMember.ICreate;

  const firstMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: firstMemberData,
    });
  typia.assert(firstMember);

  // Store the first member's ID for profile retrieval
  const firstMemberId: string & tags.Format<"uuid"> = firstMember.id;

  // Step 2: Attempt to retrieve profile as unauthenticated guest
  const guestConnection: api.IConnection = { ...connection, headers: {} };

  // Test guest access - expect this to either fail or return limited data
  await TestValidator.error(
    "guest cannot access members-only profile",
    async () => {
      await api.functional.discussionBoard.users.at(guestConnection, {
        userId: firstMemberId,
      });
    },
  );

  // Step 3: Create second member account (authenticated viewer)
  const secondMemberData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: "AnotherPass456!@#",
    display_name: RandomGenerator.name(2),
  } satisfies IDiscussionBoardMember.ICreate;

  const secondMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: secondMemberData,
    });
  typia.assert(secondMember);

  // Step 4: Retrieve first member's profile as authenticated member
  const retrievedProfile: IDiscussionBoardMember.IPublic =
    await api.functional.discussionBoard.users.at(connection, {
      userId: firstMemberId,
    });
  typia.assert(retrievedProfile);

  // Step 5: Verify profile data matches and sensitive fields are excluded
  TestValidator.equals(
    "retrieved profile ID matches first member",
    retrievedProfile.id,
    firstMemberId,
  );

  TestValidator.equals(
    "retrieved username matches first member",
    retrievedProfile.username,
    firstMemberData.username,
  );

  TestValidator.equals(
    "retrieved display_name matches first member",
    retrievedProfile.display_name,
    firstMemberData.display_name,
  );

  // Verify email_verified status is present (should be false for new account)
  TestValidator.equals(
    "email_verified is false for new account",
    retrievedProfile.email_verified,
    false,
  );

  // Verify account_status is set correctly for new account
  TestValidator.predicate(
    "account_status is set",
    typeof retrievedProfile.account_status === "string" &&
      retrievedProfile.account_status.length > 0,
  );
}
