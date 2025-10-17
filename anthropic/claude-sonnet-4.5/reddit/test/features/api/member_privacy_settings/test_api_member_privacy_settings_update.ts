import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeUser";

/**
 * Test member privacy settings update functionality.
 *
 * This test validates that authenticated members can successfully update their
 * privacy settings including profile visibility, karma display preferences, and
 * subscription list visibility. The test creates a new member account, then
 * updates privacy settings to different combinations and verifies that changes
 * are applied correctly.
 *
 * Test workflow:
 *
 * 1. Register a new member account to establish authenticated context
 * 2. Update privacy settings to public profile with hidden karma
 * 3. Update privacy settings to private profile with public subscriptions
 * 4. Update privacy settings to members_only profile with all settings configured
 * 5. Validate that all privacy setting changes are reflected correctly in
 *    responses
 */
export async function test_api_member_privacy_settings_update(
  connection: api.IConnection,
) {
  // Step 1: Register a new member account
  const memberData = {
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePass123!@#",
  } satisfies IRedditLikeMember.ICreate;

  const member: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(member);

  // Step 2: Update privacy settings - public profile with hidden karma
  const privacyUpdate1 = {
    profile_privacy: "public",
    show_karma_publicly: false,
    show_subscriptions_publicly: true,
  } satisfies IRedditLikeUser.IUpdatePrivacy;

  const updatedSettings1: IRedditLikeUser.IPrivacySettings =
    await api.functional.redditLike.member.users.privacy.updatePrivacy(
      connection,
      {
        userId: member.id,
        body: privacyUpdate1,
      },
    );
  typia.assert(updatedSettings1);

  TestValidator.equals(
    "profile privacy should be public",
    updatedSettings1.profile_privacy,
    "public",
  );
  TestValidator.equals(
    "karma should be hidden",
    updatedSettings1.show_karma_publicly,
    false,
  );
  TestValidator.equals(
    "subscriptions should be public",
    updatedSettings1.show_subscriptions_publicly,
    true,
  );

  // Step 3: Update privacy settings - private profile with public subscriptions
  const privacyUpdate2 = {
    profile_privacy: "private",
    show_karma_publicly: true,
    show_subscriptions_publicly: true,
  } satisfies IRedditLikeUser.IUpdatePrivacy;

  const updatedSettings2: IRedditLikeUser.IPrivacySettings =
    await api.functional.redditLike.member.users.privacy.updatePrivacy(
      connection,
      {
        userId: member.id,
        body: privacyUpdate2,
      },
    );
  typia.assert(updatedSettings2);

  TestValidator.equals(
    "profile privacy should be private",
    updatedSettings2.profile_privacy,
    "private",
  );
  TestValidator.equals(
    "karma should be visible",
    updatedSettings2.show_karma_publicly,
    true,
  );
  TestValidator.equals(
    "subscriptions should be visible",
    updatedSettings2.show_subscriptions_publicly,
    true,
  );

  // Step 4: Update privacy settings - members_only profile
  const privacyUpdate3 = {
    profile_privacy: "members_only",
    show_karma_publicly: false,
    show_subscriptions_publicly: false,
  } satisfies IRedditLikeUser.IUpdatePrivacy;

  const updatedSettings3: IRedditLikeUser.IPrivacySettings =
    await api.functional.redditLike.member.users.privacy.updatePrivacy(
      connection,
      {
        userId: member.id,
        body: privacyUpdate3,
      },
    );
  typia.assert(updatedSettings3);

  TestValidator.equals(
    "profile privacy should be members_only",
    updatedSettings3.profile_privacy,
    "members_only",
  );
  TestValidator.equals(
    "karma should be hidden for members_only",
    updatedSettings3.show_karma_publicly,
    false,
  );
  TestValidator.equals(
    "subscriptions should be hidden for members_only",
    updatedSettings3.show_subscriptions_publicly,
    false,
  );

  // Step 5: Test partial updates - update only one field
  const partialUpdate = {
    show_karma_publicly: true,
  } satisfies IRedditLikeUser.IUpdatePrivacy;

  const updatedSettings4: IRedditLikeUser.IPrivacySettings =
    await api.functional.redditLike.member.users.privacy.updatePrivacy(
      connection,
      {
        userId: member.id,
        body: partialUpdate,
      },
    );
  typia.assert(updatedSettings4);

  TestValidator.equals(
    "partial update should change only karma visibility",
    updatedSettings4.show_karma_publicly,
    true,
  );
}
