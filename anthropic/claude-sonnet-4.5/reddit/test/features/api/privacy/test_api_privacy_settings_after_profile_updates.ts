import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeUser";

/**
 * Test Privacy Settings Retrieval After Profile Updates
 *
 * This test validates the complete workflow of member registration, privacy
 * settings modification, and retrieval to ensure privacy settings are
 * accurately persisted and retrievable after updates.
 *
 * Business Context: Reddit-like platforms allow members to control their
 * privacy through various settings including profile visibility, karma display,
 * and subscription list visibility. This test ensures that when a member
 * modifies their privacy preferences, those changes are correctly saved and
 * accurately reflected when retrieved.
 *
 * Test Workflow:
 *
 * 1. Member Registration: Create a new member account with default privacy
 *    settings
 * 2. Initial Privacy Retrieval: Verify the member can retrieve their initial
 *    privacy settings
 * 3. Privacy Settings Update: Modify the member's privacy preferences
 * 4. Privacy Settings Re-Retrieval: Fetch the privacy settings again to confirm
 *    updates
 * 5. Validation: Verify all updated privacy values match the modifications made
 */
export async function test_api_privacy_settings_after_profile_updates(
  connection: api.IConnection,
) {
  // Step 1: Register a new member account
  const memberRegistration = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
  } satisfies IRedditLikeMember.ICreate;

  const authorizedMember: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberRegistration,
    });
  typia.assert(authorizedMember);

  // Step 2: Retrieve initial privacy settings
  const initialPrivacySettings: IRedditLikeUser.IPrivacySettings =
    await api.functional.redditLike.member.users.privacy.at(connection, {
      userId: authorizedMember.id,
    });
  typia.assert(initialPrivacySettings);

  // Step 3: Update privacy settings with new values
  const privacyUpdate = {
    profile_privacy: "members_only",
    show_karma_publicly: false,
    show_subscriptions_publicly: false,
  } satisfies IRedditLikeUser.IUpdatePrivacy;

  const updatedPrivacySettings: IRedditLikeUser.IPrivacySettings =
    await api.functional.redditLike.member.users.privacy.updatePrivacy(
      connection,
      {
        userId: authorizedMember.id,
        body: privacyUpdate,
      },
    );
  typia.assert(updatedPrivacySettings);

  // Step 4: Re-retrieve privacy settings to verify persistence
  const retrievedPrivacySettings: IRedditLikeUser.IPrivacySettings =
    await api.functional.redditLike.member.users.privacy.at(connection, {
      userId: authorizedMember.id,
    });
  typia.assert(retrievedPrivacySettings);

  // Step 5: Validate that retrieved settings match the updates
  TestValidator.equals(
    "profile_privacy should be updated to members_only",
    retrievedPrivacySettings.profile_privacy,
    "members_only",
  );

  TestValidator.equals(
    "show_karma_publicly should be updated to false",
    retrievedPrivacySettings.show_karma_publicly,
    false,
  );

  TestValidator.equals(
    "show_subscriptions_publicly should be updated to false",
    retrievedPrivacySettings.show_subscriptions_publicly,
    false,
  );

  // Step 6: Verify updated settings match the API response
  TestValidator.equals(
    "retrieved privacy settings should match updated settings",
    retrievedPrivacySettings,
    updatedPrivacySettings,
  );
}
