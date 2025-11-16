import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformUserFeedPreferences } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserFeedPreferences";

/**
 * Validate that a logged-in member user can update their own feed preference
 * configuration via PUT
 * /communityPlatform/memberUser/userFeedPreferences/{preferenceId}, and that
 * other member users cannot modify someone else’s preferences.
 *
 * Business flow:
 *
 * 1. Register and authenticate a platform admin.
 * 2. As platform admin, create a community visibility level master record.
 * 3. Register/auto-authenticate a first member user (owner of preferences).
 * 4. As that member user, create a community using the created visibility level.
 * 5. Create generic and memberUser-scoped subscriptions to that community.
 * 6. Initialize feed preferences for the member user.
 * 7. Update the feed preferences via the generic userFeedPreferences.update
 *    endpoint and verify updated vs unchanged fields.
 * 8. Register a second member user and attempt to update the first user’s
 *    preferences, expecting an authorization error.
 */
export async function test_api_user_feed_preferences_update_by_owner_member_user(
  connection: api.IConnection,
) {
  // 1. Platform admin joins (and becomes authenticated)
  const platformAdminJoinInput = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(2),
    ip: "127.0.0.1",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdmin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinInput,
    });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(platformAdmin);

  // 2. Platform admin creates a visibility level master record
  const visibilityCode = `public-${RandomGenerator.alphaNumeric(6)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public",
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityCreateBody,
      },
    );
  typia.assert<ICommunityPlatformCommunityVisibilityLevel>(visibilityLevel);
  TestValidator.equals(
    "visibility level code should match creation input",
    visibilityLevel.code,
    visibilityCode,
  );

  // 3. First member user joins (owner of preferences)
  const memberUser1JoinBody = {
    username: `user_${RandomGenerator.alphaNumeric(8)}`,
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: "127.0.0.1",
    href: "https://community.example.com/join",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberUser1: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberUser1JoinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberUser1);

  // 4. As memberUser1, create a community using the created visibility level
  const communityCreateBody = {
    identifier: `community_${RandomGenerator.alphaNumeric(6)}`,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibilityLevelCode: visibilityLevel.code,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert<ICommunityPlatformCommunity>(community);

  // 5a. Generic subscription as memberUser1
  const genericSubscriptionBody = {
    community_id: community.id,
    status: "active",
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;

  const genericSubscription: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.subscriptions.create(
      connection,
      {
        body: genericSubscriptionBody,
      },
    );
  typia.assert<ICommunityPlatformCommunitySubscription>(genericSubscription);

  // 5b. Member-user-scoped subscription using memberUser1.id
  const memberUserSubscriptionBody = {
    community_id: community.id,
    status: "active",
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;

  const memberScopedSubscription: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.memberUsers.subscriptions.create(
      connection,
      {
        memberUserId: memberUser1.id,
        body: memberUserSubscriptionBody,
      },
    );
  typia.assert<ICommunityPlatformCommunitySubscription>(
    memberScopedSubscription,
  );

  TestValidator.equals(
    "member-scoped subscription should belong to memberUser1",
    memberScopedSubscription.member_user_id,
    memberUser1.id,
  );
  TestValidator.equals(
    "member-scoped subscription should target created community",
    memberScopedSubscription.community_id,
    community.id,
  );

  // 6. Initialize feed preferences for memberUser1
  const initialPreferencesCreateBody = {
    default_post_sort_mode: "hot",
    show_sensitive_content: false,
    include_recommended_feeds: true,
  } satisfies ICommunityPlatformUserFeedPreferences.ICreate;

  const originalPref: ICommunityPlatformUserFeedPreferences =
    await api.functional.communityPlatform.memberUser.memberUsers.feedPreferences.create(
      connection,
      {
        memberUserId: memberUser1.id,
        body: initialPreferencesCreateBody,
      },
    );
  typia.assert<ICommunityPlatformUserFeedPreferences>(originalPref);

  TestValidator.equals(
    "feed preferences owner should be memberUser1",
    originalPref.memberUser.id,
    memberUser1.id,
  );
  TestValidator.equals(
    "initial default_post_sort_mode should be 'hot'",
    originalPref.default_post_sort_mode,
    initialPreferencesCreateBody.default_post_sort_mode,
  );
  TestValidator.equals(
    "initial show_sensitive_content should be false",
    originalPref.show_sensitive_content,
    initialPreferencesCreateBody.show_sensitive_content,
  );
  TestValidator.equals(
    "initial include_recommended_feeds should be true",
    originalPref.include_recommended_feeds,
    initialPreferencesCreateBody.include_recommended_feeds,
  );

  // 7. Update preferences via generic update endpoint as the owner
  const updateBody: ICommunityPlatformUserFeedPreferences.IUpdate = {
    default_post_sort_mode: "new",
    show_sensitive_content: true,
    // include_recommended_feeds intentionally omitted to remain unchanged
  } satisfies ICommunityPlatformUserFeedPreferences.IUpdate;

  const updatedPref: ICommunityPlatformUserFeedPreferences =
    await api.functional.communityPlatform.memberUser.userFeedPreferences.update(
      connection,
      {
        preferenceId: originalPref.id,
        body: updateBody,
      },
    );
  typia.assert<ICommunityPlatformUserFeedPreferences>(updatedPref);

  // Confirm values changed/unchanged as intended
  TestValidator.equals(
    "updated default_post_sort_mode should be 'new'",
    updatedPref.default_post_sort_mode,
    updateBody.default_post_sort_mode,
  );
  TestValidator.notEquals(
    "default_post_sort_mode should differ from original",
    updatedPref.default_post_sort_mode,
    originalPref.default_post_sort_mode,
  );

  TestValidator.equals(
    "updated show_sensitive_content should be true",
    updatedPref.show_sensitive_content,
    updateBody.show_sensitive_content,
  );
  TestValidator.notEquals(
    "show_sensitive_content should differ from original",
    updatedPref.show_sensitive_content,
    originalPref.show_sensitive_content,
  );

  TestValidator.equals(
    "include_recommended_feeds should remain unchanged",
    updatedPref.include_recommended_feeds,
    originalPref.include_recommended_feeds,
  );

  TestValidator.equals(
    "updated preferences should still belong to memberUser1",
    updatedPref.memberUser.id,
    memberUser1.id,
  );

  // 8. Second member user attempts to update memberUser1's preferences and should fail
  const memberUser2JoinBody = {
    username: `user_${RandomGenerator.alphaNumeric(8)}`,
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: "127.0.0.1",
    href: "https://community.example.com/join",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberUser2: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberUser2JoinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberUser2);

  const unauthorizedUpdateBody = {
    default_post_sort_mode: "top",
  } satisfies ICommunityPlatformUserFeedPreferences.IUpdate;

  await TestValidator.error(
    "other member user should not be able to update someone else's feed preferences",
    async () => {
      await api.functional.communityPlatform.memberUser.userFeedPreferences.update(
        connection,
        {
          preferenceId: originalPref.id,
          body: unauthorizedUpdateBody,
        },
      );
    },
  );
}
