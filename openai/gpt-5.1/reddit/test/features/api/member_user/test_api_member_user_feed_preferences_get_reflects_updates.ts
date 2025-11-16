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
 * Validate that member user feed preferences GET reflects the latest updates.
 *
 * Business flow:
 *
 * 1. Register a member user via /auth/memberUser/join and capture its id.
 * 2. Register a platform admin via /auth/platformAdmin/join and stay logged in.
 * 3. As platformAdmin, create a visibility level via
 *    /communityPlatform/platformAdmin/communityVisibilityLevels.
 * 4. Switch back to the member user by logging in via /auth/memberUser/login.
 * 5. As the member user, create a community using the visibilityLevelCode from
 *    step 3.
 * 6. As the member user, create a generic subscription via
 *    /communityPlatform/memberUser/subscriptions using the community id.
 * 7. As the member user, create a memberUser-scoped subscription via
 *    /communityPlatform/memberUser/memberUsers/{memberUserId}/subscriptions.
 * 8. As the member user, create initial feed preferences via POST
 *    /communityPlatform/memberUser/memberUsers/{memberUserId}/feedPreferences.
 * 9. GET the feed preferences once and capture id, values, created_at, updated_at,
 *    and memberUser.id.
 * 10. POST updated feed preferences with different values to the same endpoint.
 * 11. GET feed preferences again and verify:
 *
 * - Preference id is unchanged
 * - Values reflect the second POST body
 * - Updated_at is later than the first updated_at
 * - Created_at is not later than updated_at
 * - MemberUser.id is equal to the original member user id
 *
 * The test also implicitly verifies that the GET/POST endpoints require
 * memberUser authentication by performing them only under a logged-in member
 * user session.
 */
export async function test_api_member_user_feed_preferences_get_reflects_updates(
  connection: api.IConnection,
) {
  // 1. Register member user
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

  // 2. Register platform admin (this call switches Authorization header)
  const platformJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(2),
    ip: undefined,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformJoinBody,
    });
  typia.assert(platformAuthorized);

  // 3. As platform admin, create visibility level
  const visibilityCode = `public-${RandomGenerator.alphaNumeric(8)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public Visibility",
    description: "Visibility level for public communities in tests",
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityCreateBody,
      },
    );
  typia.assert(visibilityLevel);
  TestValidator.equals(
    "visibility level code should match",
    visibilityLevel.code,
    visibilityCode,
  );

  // 4. Switch back to member user by explicit login
  const memberLoginBody = {
    identifier: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: null,
    href: "https://member.example.com/login",
    referrer: "https://member.example.com/referrer",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberAuthorizedAgain: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberAuthorizedAgain);
  TestValidator.equals(
    "member user id must be stable across join and login",
    memberAuthorizedAgain.id,
    memberUserId,
  );

  // 5. Create community as member user using the created visibility code
  const communityIdentifier = `community-${RandomGenerator.alphaNumeric(8)}`;
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: "Test Community for Feed Preferences",
    description: "Community created in E2E test for user feed preferences.",
    visibilityLevelCode: visibilityCode,
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
  TestValidator.equals(
    "community identifier should match",
    community.identifier,
    communityIdentifier,
  );
  const communityId = community.id;

  // 6. Create generic subscription to the community
  const genericSubscriptionBody = {
    community_id: communityId,
    status: "active",
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;

  const genericSubscription: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.subscriptions.create(
      connection,
      {
        body: genericSubscriptionBody,
      },
    );
  typia.assert(genericSubscription);
  TestValidator.equals(
    "generic subscription community_id should match community",
    genericSubscription.community_id,
    communityId,
  );

  // 7. Create memberUser-scoped subscription
  const scopedSubscriptionBody = {
    community_id: communityId,
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
  TestValidator.equals(
    "scoped subscription member_user_id should match member user",
    scopedSubscription.member_user_id,
    memberUserId,
  );

  // 8. Create initial feed preferences for the member user
  const initialPreferencesBody = {
    default_post_sort_mode: "hot",
    show_sensitive_content: false,
    include_recommended_feeds: true,
  } satisfies ICommunityPlatformUserFeedPreferences.ICreate;

  const createdPreferences: ICommunityPlatformUserFeedPreferences =
    await api.functional.communityPlatform.memberUser.memberUsers.feedPreferences.create(
      connection,
      {
        memberUserId,
        body: initialPreferencesBody,
      },
    );
  typia.assert(createdPreferences);
  TestValidator.equals(
    "created preferences memberUser.id should match member user",
    createdPreferences.memberUser.id,
    memberUserId,
  );

  // 9. First GET of feed preferences
  const firstFetched: ICommunityPlatformUserFeedPreferences =
    await api.functional.communityPlatform.memberUser.memberUsers.feedPreferences.at(
      connection,
      {
        memberUserId,
      },
    );
  typia.assert(firstFetched);

  TestValidator.equals(
    "first GET: id should match created preferences id",
    firstFetched.id,
    createdPreferences.id,
  );
  TestValidator.equals(
    "first GET: default_post_sort_mode should match initial body",
    firstFetched.default_post_sort_mode,
    initialPreferencesBody.default_post_sort_mode,
  );
  TestValidator.equals(
    "first GET: show_sensitive_content should match initial body",
    firstFetched.show_sensitive_content,
    initialPreferencesBody.show_sensitive_content,
  );
  TestValidator.equals(
    "first GET: include_recommended_feeds should match initial body",
    firstFetched.include_recommended_feeds,
    initialPreferencesBody.include_recommended_feeds,
  );
  TestValidator.equals(
    "first GET: memberUser.id should match member user",
    firstFetched.memberUser.id,
    memberUserId,
  );

  const firstId = firstFetched.id;
  const firstCreatedAt = firstFetched.created_at;
  const firstUpdatedAt = firstFetched.updated_at;

  // 10. Update feed preferences with new configuration
  const updatedPreferencesBody = {
    default_post_sort_mode: "top",
    show_sensitive_content: true,
    include_recommended_feeds: false,
  } satisfies ICommunityPlatformUserFeedPreferences.ICreate;

  const updatedPreferences: ICommunityPlatformUserFeedPreferences =
    await api.functional.communityPlatform.memberUser.memberUsers.feedPreferences.create(
      connection,
      {
        memberUserId,
        body: updatedPreferencesBody,
      },
    );
  typia.assert(updatedPreferences);

  TestValidator.equals(
    "update POST: id should remain the same as original",
    updatedPreferences.id,
    firstId,
  );

  // 11. Second GET of feed preferences to verify reflection of updates
  const secondFetched: ICommunityPlatformUserFeedPreferences =
    await api.functional.communityPlatform.memberUser.memberUsers.feedPreferences.at(
      connection,
      {
        memberUserId,
      },
    );
  typia.assert(secondFetched);

  TestValidator.equals(
    "second GET: id should remain stable",
    secondFetched.id,
    firstId,
  );
  TestValidator.equals(
    "second GET: default_post_sort_mode should reflect updated value",
    secondFetched.default_post_sort_mode,
    updatedPreferencesBody.default_post_sort_mode,
  );
  TestValidator.equals(
    "second GET: show_sensitive_content should reflect updated value",
    secondFetched.show_sensitive_content,
    updatedPreferencesBody.show_sensitive_content,
  );
  TestValidator.equals(
    "second GET: include_recommended_feeds should reflect updated value",
    secondFetched.include_recommended_feeds,
    updatedPreferencesBody.include_recommended_feeds,
  );
  TestValidator.equals(
    "second GET: memberUser.id should still match member user",
    secondFetched.memberUser.id,
    memberUserId,
  );

  // Compare timestamps using Date to avoid string-order pitfalls
  const firstUpdatedDate = new Date(firstUpdatedAt);
  const secondUpdatedDate = new Date(secondFetched.updated_at);
  const createdDate = new Date(secondFetched.created_at);

  TestValidator.predicate(
    "second updated_at should be later than first updated_at",
    secondUpdatedDate.getTime() > firstUpdatedDate.getTime(),
  );
  TestValidator.predicate(
    "created_at should not be later than updated_at",
    createdDate.getTime() <= secondUpdatedDate.getTime(),
  );
}
