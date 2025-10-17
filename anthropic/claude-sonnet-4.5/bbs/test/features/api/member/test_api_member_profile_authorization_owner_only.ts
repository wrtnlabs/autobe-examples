import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test that members can only update their own profiles and cannot modify other
 * members' profiles.
 *
 * This test validates authorization boundaries by creating two separate member
 * accounts and verifying that one member cannot update another member's profile
 * without appropriate permissions. The test ensures proper ownership validation
 * is enforced by the API.
 *
 * Steps:
 *
 * 1. Create Member A through registration endpoint
 * 2. Create Member B through registration endpoint
 * 3. Attempt to update Member B's profile using Member A's credentials (should
 *    fail)
 * 4. Verify the unauthorized update attempt is rejected with proper error
 * 5. Update Member A's own profile with Member A's credentials (should succeed)
 * 6. Verify Member A's profile update was successful
 */
export async function test_api_member_profile_authorization_owner_only(
  connection: api.IConnection,
) {
  // Step 1: Create Member A
  const memberAEmail = typia.random<string & tags.Format<"email">>();
  const memberAUsername = RandomGenerator.alphaNumeric(10);
  const memberAPassword = "SecureP@ss123";

  const memberABody = {
    username: memberAUsername,
    email: memberAEmail,
    password: memberAPassword,
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardMember.ICreate;

  const memberAAuth: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberABody,
    });
  typia.assert(memberAAuth);

  // Step 2: Create Member B
  const memberBEmail = typia.random<string & tags.Format<"email">>();
  const memberBUsername = RandomGenerator.alphaNumeric(10);
  const memberBPassword = "AnotherP@ss456";

  const memberBBody = {
    username: memberBUsername,
    email: memberBEmail,
    password: memberBPassword,
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardMember.ICreate;

  const memberBAuth: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberBBody,
    });
  typia.assert(memberBAuth);

  // Step 3: Attempt to update Member B's profile using Member A's credentials
  const unauthorizedUpdateData = {
    display_name: "Unauthorized Change",
    bio: "This should not be allowed",
  } satisfies IDiscussionBoardMember.IUpdate;

  await TestValidator.error(
    "Member A cannot update Member B's profile",
    async () => {
      await api.functional.discussionBoard.member.users.update(connection, {
        userId: memberBAuth.id,
        body: unauthorizedUpdateData,
      });
    },
  );

  // Step 5: Update Member A's own profile with Member A's credentials
  const authorizedUpdateData = {
    display_name: "Updated Display Name",
    bio: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 8 }),
    location: "Seoul, South Korea",
    profile_visibility: "public",
  } satisfies IDiscussionBoardMember.IUpdate;

  const updatedProfile: IDiscussionBoardMember =
    await api.functional.discussionBoard.member.users.update(connection, {
      userId: memberAAuth.id,
      body: authorizedUpdateData,
    });
  typia.assert(updatedProfile);

  // Step 6: Verify Member A's profile update was successful
  TestValidator.equals(
    "Updated display name matches",
    updatedProfile.display_name,
    authorizedUpdateData.display_name,
  );
  TestValidator.equals(
    "Updated bio matches",
    updatedProfile.bio,
    authorizedUpdateData.bio,
  );
  TestValidator.equals(
    "Updated location matches",
    updatedProfile.location,
    authorizedUpdateData.location,
  );
  TestValidator.equals(
    "Updated profile visibility matches",
    updatedProfile.profile_visibility,
    authorizedUpdateData.profile_visibility,
  );
  TestValidator.equals(
    "Member A user ID remains unchanged",
    updatedProfile.id,
    memberAAuth.id,
  );
}
