import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";

/**
 * Test authenticated member avatar_url update functionality.
 *
 * This test validates that an authenticated member can successfully update
 * their profile avatar_url to customize their profile picture. The avatar_url
 * field accepts a URI reference to an external image (JPEG, PNG, GIF, WebP
 * formats with 5MB max size).
 *
 * Test workflow:
 *
 * 1. Create and authenticate a new member account
 * 2. Generate a valid avatar URI
 * 3. Update the member's profile with the new avatar_url
 * 4. Verify the avatar_url is correctly stored and returned
 */
export async function test_api_member_profile_update_avatar(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a member account
  const memberData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityGuest.ICreate;

  const authorizedMember: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(authorizedMember);

  // Step 2: Generate a valid avatar URL
  const newAvatarUrl: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();

  // Step 3: Update the member's profile with the new avatar_url
  const updatedProfile: IRedditCommunityGuest.ISummary =
    await api.functional.redditCommunity.member.members.update(connection, {
      username: authorizedMember.username,
      body: {
        avatar_url: newAvatarUrl,
      } satisfies IRedditCommunityGuest.IUpdate,
    });
  typia.assert(updatedProfile);

  // Step 4: Verify the avatar_url was successfully updated
  TestValidator.equals(
    "avatar_url should be updated",
    updatedProfile.avatar_url,
    newAvatarUrl,
  );

  // Verify the username matches
  TestValidator.equals(
    "username should match",
    updatedProfile.username,
    authorizedMember.username,
  );

  // Verify the member ID matches
  TestValidator.equals(
    "member ID should match",
    updatedProfile.id,
    authorizedMember.id,
  );
}
