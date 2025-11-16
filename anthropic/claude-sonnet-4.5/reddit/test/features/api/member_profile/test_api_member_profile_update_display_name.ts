import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";

/**
 * Test member profile display_name update functionality.
 *
 * This test validates that an authenticated member can successfully update
 * their own display_name through the profile update endpoint. It verifies the
 * profile customization feature that allows members to set a personalized
 * display name (up to 50 characters with Unicode support) that appears
 * throughout the platform.
 *
 * Test workflow:
 *
 * 1. Register and authenticate a new member account
 * 2. Update the member's display_name field
 * 3. Verify the display_name was successfully persisted in the response
 */
export async function test_api_member_profile_update_display_name(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a member account
  const initialDisplayName = RandomGenerator.name(2);
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<string & tags.MinLength<8>>();
  const memberUsername = typia.random<
    string & tags.MinLength<3> & tags.MaxLength<50>
  >();

  const registrationBody = {
    username: memberUsername,
    email: memberEmail,
    password: memberPassword,
    display_name: initialDisplayName,
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    avatar_url: typia.random<string & tags.Format<"uri">>(),
    show_online_status: false,
    show_subscribed_communities: false,
    show_activity_feed: true,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityGuest.ICreate;

  const authorizedMember: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: registrationBody,
    });
  typia.assert(authorizedMember);

  // Step 2: Update the display_name field
  const newDisplayName = RandomGenerator.name(2);

  const updateBody = {
    display_name: newDisplayName,
  } satisfies IRedditCommunityGuest.IUpdate;

  const updatedProfile: IRedditCommunityGuest.ISummary =
    await api.functional.redditCommunity.member.members.update(connection, {
      username: memberUsername,
      body: updateBody,
    });
  typia.assert(updatedProfile);

  // Step 3: Verify the display_name was successfully updated
  TestValidator.equals(
    "updated display_name matches the new value",
    updatedProfile.display_name,
    newDisplayName,
  );

  TestValidator.equals(
    "member ID remains unchanged",
    updatedProfile.id,
    authorizedMember.id,
  );

  TestValidator.equals(
    "username remains unchanged",
    updatedProfile.username,
    memberUsername,
  );
}
