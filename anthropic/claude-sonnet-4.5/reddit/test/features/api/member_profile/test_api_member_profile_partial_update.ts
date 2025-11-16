import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";

/**
 * Test partial update functionality for member profiles.
 *
 * Validates that the profile update operation correctly implements the partial
 * update pattern where only provided fields are modified and omitted fields
 * retain their current values. This ensures flexibility in profile management
 * without requiring clients to send complete profile data for every update.
 *
 * Test Process:
 *
 * 1. Create and authenticate a new member account
 * 2. Perform initial profile update with multiple fields (display_name, bio,
 *    avatar_url)
 * 3. Verify the initial update was successful
 * 4. Perform second update with only one field changed (display_name)
 * 5. Verify only the changed field updated while bio and avatar_url remained
 *    unchanged
 */
export async function test_api_member_profile_partial_update(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a new member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<string & tags.MinLength<8>>();
  const memberUsername = typia.random<
    string & tags.MinLength<3> & tags.MaxLength<50>
  >();

  const joinBody = {
    username: memberUsername,
    email: memberEmail,
    password: memberPassword,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityGuest.ICreate;

  const authorizedMember: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: joinBody,
    });
  typia.assert(authorizedMember);

  // Step 2: Perform initial profile update with multiple observable fields
  const firstDisplayName = "First Display Name";
  const firstBio = "This is my first biography text";
  const firstAvatarUrl = "https://example.com/avatar1.png";

  const firstUpdateBody = {
    display_name: firstDisplayName,
    bio: firstBio,
    avatar_url: firstAvatarUrl,
  } satisfies IRedditCommunityGuest.IUpdate;

  const firstUpdatedProfile: IRedditCommunityGuest.ISummary =
    await api.functional.redditCommunity.member.members.update(connection, {
      username: memberUsername,
      body: firstUpdateBody,
    });
  typia.assert(firstUpdatedProfile);

  // Step 3: Verify the initial update was successful
  TestValidator.equals(
    "first update - display_name",
    firstUpdatedProfile.display_name,
    firstDisplayName,
  );
  TestValidator.equals("first update - bio", firstUpdatedProfile.bio, firstBio);
  TestValidator.equals(
    "first update - avatar_url",
    firstUpdatedProfile.avatar_url,
    firstAvatarUrl,
  );

  // Step 4: Perform second partial update with only display_name changed
  const secondDisplayName = "Second Display Name";

  const secondUpdateBody = {
    display_name: secondDisplayName,
  } satisfies IRedditCommunityGuest.IUpdate;

  const secondUpdatedProfile: IRedditCommunityGuest.ISummary =
    await api.functional.redditCommunity.member.members.update(connection, {
      username: memberUsername,
      body: secondUpdateBody,
    });
  typia.assert(secondUpdatedProfile);

  // Step 5: Verify only display_name changed, all other fields unchanged
  TestValidator.equals(
    "second update - display_name changed",
    secondUpdatedProfile.display_name,
    secondDisplayName,
  );
  TestValidator.equals(
    "second update - bio unchanged",
    secondUpdatedProfile.bio,
    firstBio,
  );
  TestValidator.equals(
    "second update - avatar_url unchanged",
    secondUpdatedProfile.avatar_url,
    firstAvatarUrl,
  );

  // Verify the profile still has the same ID and username
  TestValidator.equals(
    "profile ID unchanged",
    secondUpdatedProfile.id,
    firstUpdatedProfile.id,
  );
  TestValidator.equals(
    "username unchanged",
    secondUpdatedProfile.username,
    memberUsername,
  );
}
