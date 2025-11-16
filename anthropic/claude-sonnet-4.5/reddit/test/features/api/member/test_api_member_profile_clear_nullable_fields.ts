import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";

/**
 * Test that nullable fields (display_name, bio, avatar_url) can be cleared by
 * setting them to null.
 *
 * This validates that members can remove optional profile customizations and
 * revert to defaults (username display, no bio, default avatar). The test
 * authenticates as a member, sets all nullable fields to non-null values, then
 * updates them to null, and verifies they are cleared. This ensures members
 * have full control over their profile presentation.
 *
 * Test Steps:
 *
 * 1. Create and authenticate a new member with all nullable fields populated
 * 2. Verify the initial profile has non-null values for display_name, bio, and
 *    avatar_url
 * 3. Update the profile to set all nullable fields to null
 * 4. Verify the updated profile has all nullable fields cleared (null values)
 * 5. Validate that the member can successfully remove all optional customizations
 */
export async function test_api_member_profile_clear_nullable_fields(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a new member with all nullable fields populated
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<string & tags.MinLength<8>>();
  const initialDisplayName = RandomGenerator.name(2);
  const initialBio = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 10,
  });
  const initialAvatarUrl = typia.random<string & tags.Format<"uri">>();

  const memberBody = {
    username: RandomGenerator.alphaNumeric(10),
    email: memberEmail,
    password: memberPassword,
    display_name: initialDisplayName,
    bio: initialBio,
    avatar_url: initialAvatarUrl,
    show_online_status: false,
    show_subscribed_communities: false,
    show_activity_feed: true,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityGuest.ICreate;

  const authorizedMember: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberBody,
    });
  typia.assert(authorizedMember);

  // Step 2: Verify the initial profile has non-null values for nullable fields
  TestValidator.equals(
    "initial display_name should match registration value",
    authorizedMember.display_name,
    initialDisplayName,
  );

  TestValidator.equals(
    "initial bio should match registration value",
    authorizedMember.bio,
    initialBio,
  );

  TestValidator.equals(
    "initial avatar_url should match registration value",
    authorizedMember.avatar_url,
    initialAvatarUrl,
  );

  // Step 3: Update the profile to set all nullable fields to null
  const updateBody = {
    display_name: null,
    bio: null,
    avatar_url: null,
  } satisfies IRedditCommunityGuest.IUpdate;

  const updatedProfile: IRedditCommunityGuest.ISummary =
    await api.functional.redditCommunity.member.members.update(connection, {
      username: authorizedMember.username,
      body: updateBody,
    });
  typia.assert(updatedProfile);

  // Step 4: Verify the updated profile has all nullable fields cleared (null values)
  TestValidator.equals(
    "display_name should be null after clearing",
    updatedProfile.display_name,
    null,
  );

  TestValidator.equals(
    "bio should be null after clearing",
    updatedProfile.bio,
    null,
  );

  TestValidator.equals(
    "avatar_url should be null after clearing",
    updatedProfile.avatar_url,
    null,
  );

  // Step 5: Validate that other profile fields remain unchanged
  TestValidator.equals(
    "username should remain unchanged",
    updatedProfile.username,
    authorizedMember.username,
  );

  TestValidator.equals(
    "member ID should remain unchanged",
    updatedProfile.id,
    authorizedMember.id,
  );
}
