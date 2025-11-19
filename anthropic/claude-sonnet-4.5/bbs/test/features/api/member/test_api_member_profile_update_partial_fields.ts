import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test partial profile updates where only specific fields are modified.
 *
 * This test validates that the member profile update endpoint supports partial
 * updates, allowing members to modify individual profile fields without
 * affecting other fields. It ensures that unchanged fields retain their
 * original values and that the updated_at timestamp is properly updated with
 * each modification.
 *
 * Process:
 *
 * 1. Create and authenticate a member account with complete profile data
 * 2. Update only the bio field and verify other fields remain unchanged
 * 3. Update only the display_name field and verify other fields remain unchanged
 * 4. Verify updated_at timestamp changes with each modification
 */
export async function test_api_member_profile_update_partial_fields(
  connection: api.IConnection,
) {
  // Step 1: Create member account with complete profile data
  const initialEmail = typia.random<string & tags.Format<"email">>();
  const initialPassword = typia.random<string & tags.Format<"password">>();
  const initialUsername = RandomGenerator.alphaNumeric(10);
  const initialDisplayName = RandomGenerator.name(2);
  const initialBio = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 4,
    wordMax: 8,
  });

  const createdMember = await api.functional.auth.member.join(connection, {
    body: {
      email: initialEmail,
      password: initialPassword,
      username: initialUsername,
      display_name: initialDisplayName,
      bio: initialBio,
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(createdMember);

  // Verify initial profile data
  TestValidator.equals(
    "initial display_name matches",
    createdMember.display_name,
    initialDisplayName,
  );
  TestValidator.equals("initial bio matches", createdMember.bio, initialBio);

  // Step 2: Update only the bio field
  const updatedBio = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 5,
    wordMax: 10,
  });

  const afterBioUpdate =
    await api.functional.discussionBoard.member.members.update(connection, {
      memberId: createdMember.id,
      body: {
        bio: updatedBio,
      } satisfies IDiscussionBoardMember.IUpdate,
    });
  typia.assert(afterBioUpdate);

  // Verify bio was updated but other fields remained unchanged
  TestValidator.equals(
    "bio updated successfully",
    afterBioUpdate.bio,
    updatedBio,
  );
  TestValidator.equals(
    "display_name unchanged after bio update",
    afterBioUpdate.display_name,
    initialDisplayName,
  );
  TestValidator.notEquals(
    "updated_at changed after bio update",
    afterBioUpdate.updated_at,
    createdMember.updated_at,
  );

  // Step 3: Update only the display_name field
  const updatedDisplayName = RandomGenerator.name(3);

  const afterDisplayNameUpdate =
    await api.functional.discussionBoard.member.members.update(connection, {
      memberId: createdMember.id,
      body: {
        display_name: updatedDisplayName,
      } satisfies IDiscussionBoardMember.IUpdate,
    });
  typia.assert(afterDisplayNameUpdate);

  // Verify display_name was updated but bio remained at the previously updated value
  TestValidator.equals(
    "display_name updated successfully",
    afterDisplayNameUpdate.display_name,
    updatedDisplayName,
  );
  TestValidator.equals(
    "bio retained from previous update",
    afterDisplayNameUpdate.bio,
    updatedBio,
  );
  TestValidator.notEquals(
    "updated_at changed after display_name update",
    afterDisplayNameUpdate.updated_at,
    afterBioUpdate.updated_at,
  );

  // Step 4: Verify the final state has all updates applied
  TestValidator.equals(
    "final bio matches second update",
    afterDisplayNameUpdate.bio,
    updatedBio,
  );
  TestValidator.equals(
    "final display_name matches third update",
    afterDisplayNameUpdate.display_name,
    updatedDisplayName,
  );
  TestValidator.equals(
    "member ID unchanged throughout updates",
    afterDisplayNameUpdate.id,
    createdMember.id,
  );
  TestValidator.equals(
    "username unchanged throughout updates",
    afterDisplayNameUpdate.username,
    initialUsername,
  );
  TestValidator.equals(
    "email unchanged throughout updates",
    afterDisplayNameUpdate.email,
    initialEmail,
  );
}
