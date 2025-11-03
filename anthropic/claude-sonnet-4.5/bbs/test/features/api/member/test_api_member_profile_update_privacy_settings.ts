import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test member privacy settings update functionality.
 *
 * This test validates that members can successfully update their
 * profile_visibility and activity_visibility privacy settings through the
 * profile update operation.
 *
 * Test workflow:
 *
 * 1. Create a new member account with default public visibility
 * 2. Authenticate and receive authorization tokens
 * 3. Update privacy settings to more restrictive values
 * 4. Verify the updated settings are correctly saved
 * 5. Confirm changes persist in the member profile
 */
export async function test_api_member_profile_update_privacy_settings(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account with default settings
  const username = RandomGenerator.alphaNumeric(8);
  const email = `${RandomGenerator.alphaNumeric(6)}@example.com`;
  const password = "SecurePass123!";

  const joinedMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: username,
        email: email,
        password: password,
        ip: null,
        href: "https://example.com/register",
        referrer: "https://example.com/home",
      } satisfies IDiscussionBoardMember.IJoin,
    });
  typia.assert(joinedMember);

  // Step 2: Verify initial privacy settings are public (default)
  TestValidator.equals(
    "initial profile visibility should be public",
    joinedMember.profile_visibility,
    "public",
  );
  TestValidator.equals(
    "initial activity visibility should be public",
    joinedMember.activity_visibility,
    "public",
  );

  // Step 3: Update privacy settings to more restrictive values
  const updatedMember: IDiscussionBoardMember =
    await api.functional.discussionBoard.member.members.update(connection, {
      memberUsername: username,
      body: {
        profile_visibility: "members_only",
        activity_visibility: "hidden",
      } satisfies IDiscussionBoardMember.IUpdate,
    });
  typia.assert(updatedMember);

  // Step 4: Verify the privacy settings were updated correctly
  TestValidator.equals(
    "profile visibility updated to members_only",
    updatedMember.profile_visibility,
    "members_only",
  );
  TestValidator.equals(
    "activity visibility updated to hidden",
    updatedMember.activity_visibility,
    "hidden",
  );

  // Step 5: Verify other profile fields remain unchanged
  TestValidator.equals(
    "username remains unchanged",
    updatedMember.username,
    username,
  );
  TestValidator.equals("email remains unchanged", updatedMember.email, email);
  TestValidator.equals(
    "member ID remains unchanged",
    updatedMember.id,
    joinedMember.id,
  );

  // Step 6: Test updating to private profile visibility
  const privateUpdate: IDiscussionBoardMember =
    await api.functional.discussionBoard.member.members.update(connection, {
      memberUsername: username,
      body: {
        profile_visibility: "private",
      } satisfies IDiscussionBoardMember.IUpdate,
    });
  typia.assert(privateUpdate);

  // Step 7: Verify private visibility setting was applied
  TestValidator.equals(
    "profile visibility updated to private",
    privateUpdate.profile_visibility,
    "private",
  );
  TestValidator.equals(
    "activity visibility remains hidden",
    privateUpdate.activity_visibility,
    "hidden",
  );
}
