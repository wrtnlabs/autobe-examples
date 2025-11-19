import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test avatar_url field validation requiring valid URI format.
 *
 * This test validates that the member profile update endpoint accepts valid URI
 * formats for the avatar_url field. It creates a member account and verifies
 * that:
 *
 * 1. Valid JPEG image URIs are accepted
 * 2. Valid PNG image URIs are accepted
 * 3. The URI format validation works correctly for image URLs
 *
 * Business context: Avatar URLs must be valid URIs pointing to JPEG or PNG
 * images resized to 200x200 pixels for consistent member profile display.
 */
export async function test_api_member_profile_update_avatar_url_format(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate as a member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "SecurePass123!";
  const memberUsername = RandomGenerator.alphaNumeric(8);

  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      username: memberUsername,
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: "https://example.com/register",
      referrer: "https://example.com/home",
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Update profile with valid JPEG image URI
  const jpegAvatarUrl = "https://example.com/avatars/user-avatar.jpg";
  const updatedWithJpeg =
    await api.functional.discussionBoard.member.members.update(connection, {
      memberId: member.id,
      body: {
        avatar_url: jpegAvatarUrl,
      } satisfies IDiscussionBoardMember.IUpdate,
    });
  typia.assert(updatedWithJpeg);
  TestValidator.equals(
    "JPEG avatar URL should be accepted",
    updatedWithJpeg.avatar_url,
    jpegAvatarUrl,
  );

  // Step 3: Update profile with valid PNG image URI
  const pngAvatarUrl = "https://cdn.example.com/images/profile-pic.png";
  const updatedWithPng =
    await api.functional.discussionBoard.member.members.update(connection, {
      memberId: member.id,
      body: {
        avatar_url: pngAvatarUrl,
      } satisfies IDiscussionBoardMember.IUpdate,
    });
  typia.assert(updatedWithPng);
  TestValidator.equals(
    "PNG avatar URL should be accepted",
    updatedWithPng.avatar_url,
    pngAvatarUrl,
  );
}
