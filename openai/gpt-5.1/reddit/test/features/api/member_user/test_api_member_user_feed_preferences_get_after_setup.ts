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
 * E2E: Retrieve member user feed preferences after complete setup.
 *
 * Business workflow validated by this test:
 *
 * 1. A member user self-registers and obtains an authenticated context.
 * 2. A platform admin defines at least one community visibility level.
 * 3. The member user creates a new community using that visibility level.
 * 4. The member user subscribes to the community via both generic and
 *    memberUser-scoped subscription endpoints.
 * 5. The member user creates per-user feed preferences associated with their
 *    account.
 * 6. The GET feedPreferences endpoint returns the stored preferences and
 *    associates them with the correct member user.
 *
 * The test focuses on the happy path and ensures that:
 *
 * - Prerequisite entities (visibility level, community, subscriptions) can be
 *   created with realistic DTOs using the provided SDK.
 * - Feed preferences created by POST are later readable via GET.
 * - The returned preference fields match what was persisted.
 * - The memberUser association in the preference DTO matches the authenticated
 *   member user (id and username).
 * - Timestamp fields and id are populated (non-empty strings).
 */
export async function test_api_member_user_feed_preferences_get_after_setup(
  connection: api.IConnection,
) {
  // 1. Member user joins (registers)
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://member.example.com/join",
    referrer: "https://member.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  const memberUserId = memberAuthorized.id;
  const memberUsername = memberAuthorized.username;

  // 2. Platform admin joins
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    ip: undefined,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const adminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 3. As platform admin, create a visibility level
  const visibilityCode = `public-${RandomGenerator.alphaNumeric(6)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public Visibility",
    description: "Publicly visible community visibility level for tests.",
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: visibilityCreateBody },
    );
  typia.assert(visibilityLevel);

  // 4. Switch back to member user context by logging in explicitly
  const memberLoginBody = {
    identifier: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: null,
    href: "https://member.example.com/login",
    referrer: "https://member.example.com/home",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberLoginAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoginAuthorized);

  // 5. Member user creates a community using the created visibility level
  const communityCreateBody = {
    identifier: `community-${RandomGenerator.alphaNumeric(8)}`,
    title: "Test Community for Feed Preferences",
    description: "Community created as part of feed preference E2E test.",
    visibilityLevelCode: visibilityLevel.code,
    isNsfw: false,
    primaryTagIds: undefined,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  // 6. Generic subscription to the community
  const genericSubscriptionBody = {
    community_id: community.id,
    status: "active",
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;

  const genericSubscription: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.subscriptions.create(
      connection,
      { body: genericSubscriptionBody },
    );
  typia.assert(genericSubscription);

  // 7. MemberUser-scoped subscription for the same community
  const scopedSubscriptionBody = {
    community_id: community.id,
    status: "active",
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;

  const scopedSubscription: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.memberUsers.subscriptions.create(
      connection,
      {
        memberUserId,
        body: scopedSubscriptionBody,
      },
    );
  typia.assert(scopedSubscription);

  // 8. Create feed preferences for the member user
  const preferenceCreateBody = {
    default_post_sort_mode: "hot",
    show_sensitive_content: false,
    include_recommended_feeds: true,
  } satisfies ICommunityPlatformUserFeedPreferences.ICreate;

  const createdPreferences: ICommunityPlatformUserFeedPreferences =
    await api.functional.communityPlatform.memberUser.memberUsers.feedPreferences.create(
      connection,
      {
        memberUserId,
        body: preferenceCreateBody,
      },
    );
  typia.assert(createdPreferences);

  // 9. Retrieve feed preferences via GET
  const fetchedPreferences: ICommunityPlatformUserFeedPreferences =
    await api.functional.communityPlatform.memberUser.memberUsers.feedPreferences.at(
      connection,
      { memberUserId },
    );
  typia.assert(fetchedPreferences);

  // 10. Business assertions on returned preferences
  TestValidator.equals(
    "default_post_sort_mode matches created value",
    fetchedPreferences.default_post_sort_mode,
    preferenceCreateBody.default_post_sort_mode,
  );

  TestValidator.equals(
    "show_sensitive_content matches created value",
    fetchedPreferences.show_sensitive_content,
    preferenceCreateBody.show_sensitive_content,
  );

  TestValidator.equals(
    "include_recommended_feeds matches created value",
    fetchedPreferences.include_recommended_feeds,
    preferenceCreateBody.include_recommended_feeds,
  );

  TestValidator.equals(
    "memberUser.id matches authorized member user id",
    fetchedPreferences.memberUser.id,
    memberUserId,
  );

  TestValidator.equals(
    "memberUser.username matches join username",
    fetchedPreferences.memberUser.username,
    memberUsername,
  );

  TestValidator.predicate(
    "created_at is a non-empty string",
    fetchedPreferences.created_at.length > 0,
  );

  TestValidator.predicate(
    "updated_at is a non-empty string",
    fetchedPreferences.updated_at.length > 0,
  );

  TestValidator.predicate(
    "preferences id is a non-empty string",
    fetchedPreferences.id.length > 0,
  );
}
