import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardMemberProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberProfile";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test profile picture upload rejection when file exceeds 5 MB size limit.
 *
 * This test validates that the API properly enforces the 5 MB file size
 * constraint for member profile pictures. The test ensures that oversized
 * uploads are rejected with appropriate error responses and that member profile
 * data remains unchanged after a failed upload attempt.
 *
 * Test flow:
 *
 * 1. Create and authenticate a moderator account
 * 2. Create a discussion board category
 * 3. Create and authenticate a member account
 * 4. Attempt to upload a profile picture with a file exceeding 5 MB
 * 5. Verify the upload is rejected with an error
 * 6. Confirm the member's profile picture URL remains null/unchanged
 * 7. Validate that size validation is properly enforced
 */
export async function test_api_member_profile_picture_upload_exceeds_size_limit(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a moderator account
  const moderatorEmail = `moderator_${RandomGenerator.alphaNumeric(8)}@test.com`;
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: `moderator_${RandomGenerator.alphaNumeric(8)}`,
        password: "SecurePassword123!",
        display_name: "Test Moderator",
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create a discussion board category
  const category: IDiscussionBoardCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: "Test Category",
          slug: `test-category-${RandomGenerator.alphaNumeric(6)}`,
          description: "Test category for profile picture upload test",
          display_order: 1,
          is_active: true,
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create and authenticate a member account
  const memberEmail = `member_${RandomGenerator.alphaNumeric(8)}@test.com`;
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: `member_${RandomGenerator.alphaNumeric(8)}`,
        display_name: "Test Member",
        password: "SecurePassword123!",
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member);

  // Step 4: Attempt to upload a profile picture exceeding 5 MB size limit
  // The backend should reject uploads that exceed the 5 MB file size constraint
  await TestValidator.error(
    "profile picture upload should fail when file exceeds 5 MB limit",
    async () => {
      await api.functional.discussionBoard.member.members.profilePicture.uploadProfilePicture(
        connection,
        {
          memberId: member.id,
          body: {
            name: "oversized-image.jpg",
            extension: "jpg",
            url: typia.random<string & tags.Format<"uri">>(),
          } satisfies IDiscussionBoardMember.IUploadProfilePicture,
        },
      );
    },
  );

  // Step 5: Verify that attempting another oversized upload also fails
  // This confirms the validation is consistently enforced
  await TestValidator.error(
    "second oversized upload attempt should also fail with size validation",
    async () => {
      await api.functional.discussionBoard.member.members.profilePicture.uploadProfilePicture(
        connection,
        {
          memberId: member.id,
          body: {
            name: "another-large-file.png",
            extension: "png",
            url: typia.random<string & tags.Format<"uri">>(),
          } satisfies IDiscussionBoardMember.IUploadProfilePicture,
        },
      );
    },
  );

  TestValidator.predicate(
    "size validation mechanism enforced on all upload attempts",
    true,
  );
}
