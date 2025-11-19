import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test that members can successfully update their own profile information.
 *
 * This test validates the member profile update functionality by:
 *
 * 1. Creating and authenticating as a member account
 * 2. Updating the member's profile with new display_name, bio, and avatar_url
 * 3. Verifying the operation returns the updated member profile with all changes
 *    reflected
 * 4. Confirming that the updated_at timestamp is automatically set to the current
 *    time
 * 5. Validating that members can modify their own editable profile fields without
 *    moderator privileges
 * 6. Ensuring non-editable fields remain unchanged after the update
 */
export async function test_api_member_profile_update_by_owner(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate a new member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<string & tags.Format<"password">>();
  const memberUsername = RandomGenerator.alphaNumeric(
    typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<3> & tags.Maximum<30>
    >(),
  );

  const registeredMember = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      username: memberUsername,
      display_name: RandomGenerator.name(2),
      bio: RandomGenerator.paragraph({ sentences: 5, wordMin: 4, wordMax: 8 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(registeredMember);

  const memberId = registeredMember.id;
  const originalUpdatedAt = registeredMember.updated_at;

  // Step 2: Prepare updated profile data
  const updatedDisplayName = RandomGenerator.name(3);
  const updatedBio = RandomGenerator.paragraph({
    sentences: 8,
    wordMin: 5,
    wordMax: 10,
  });
  const updatedAvatarUrl = typia.random<string & tags.Format<"uri">>();

  const updateRequestBody = {
    display_name: updatedDisplayName,
    bio: updatedBio,
    avatar_url: updatedAvatarUrl,
  } satisfies IDiscussionBoardMember.IUpdate;

  // Step 3: Update the member's profile
  const updatedMember =
    await api.functional.discussionBoard.member.members.update(connection, {
      memberId: memberId,
      body: updateRequestBody,
    });
  typia.assert(updatedMember);

  // Step 4: Validate the update response contains the new values
  TestValidator.equals(
    "updated display_name matches",
    updatedMember.display_name,
    updatedDisplayName,
  );
  TestValidator.equals("updated bio matches", updatedMember.bio, updatedBio);
  TestValidator.equals(
    "updated avatar_url matches",
    updatedMember.avatar_url,
    updatedAvatarUrl,
  );

  // Step 5: Verify updated_at timestamp has changed
  TestValidator.notEquals(
    "updated_at timestamp has changed",
    updatedMember.updated_at,
    originalUpdatedAt,
  );

  // Step 6: Verify other fields remain unchanged
  TestValidator.equals("member ID unchanged", updatedMember.id, memberId);
  TestValidator.equals("email unchanged", updatedMember.email, memberEmail);
  TestValidator.equals(
    "username unchanged",
    updatedMember.username,
    memberUsername,
  );
  TestValidator.equals(
    "email_verified unchanged",
    updatedMember.email_verified,
    registeredMember.email_verified,
  );
  TestValidator.equals(
    "is_suspended unchanged",
    updatedMember.is_suspended,
    registeredMember.is_suspended,
  );
}
