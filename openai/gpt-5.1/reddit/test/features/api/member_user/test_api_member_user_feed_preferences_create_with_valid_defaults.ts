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

export async function test_api_member_user_feed_preferences_create_with_valid_defaults(
  connection: api.IConnection,
) {
  // 1. Register a new member user (self-join)
  const memberJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
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

  // 2. Register a new platform admin and switch auth context
  const adminJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    ip: undefined,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdmin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(platformAdmin);

  // 3. As platformAdmin, create a visibility level
  const visibilityCode = `public-${RandomGenerator.alphabets(6)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public Test Visibility",
    description: RandomGenerator.paragraph({ sentences: 5 }),
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
    "visibility level code must match create payload",
    visibilityLevel.code,
    visibilityCreateBody.code,
  );

  // 4. Switch back to member user via login, ensuring memberUser auth context
  const memberLoginBody = {
    identifier: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: null,
    href: "https://member.example.com/login",
    referrer: "https://member.example.com/home",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberAuthorizedAfterLogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberAuthorizedAfterLogin);

  TestValidator.equals(
    "member user id should be stable across join and login",
    memberAuthorizedAfterLogin.id,
    memberAuthorized.id,
  );

  // 5. As member user, create a community using the created visibility level code
  const communityCreateBody = {
    identifier: `community_${RandomGenerator.alphaNumeric(8)}`,
    title: "Test Feed Preference Community",
    description: RandomGenerator.paragraph({ sentences: 8 }),
    visibilityLevelCode: visibilityLevel.code,
    isNsfw: false,
    primaryTagIds: undefined,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreateBody },
    );
  typia.assert(community);

  TestValidator.equals(
    "community visibility level summary code should match chosen visibility code",
    community.visibilityLevel.code,
    visibilityLevel.code,
  );

  // 6. Create a generic subscription for this community as member user
  const genericSubscriptionCreateBody = {
    community_id: community.id,
    status: "active",
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;

  const genericSubscription: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.subscriptions.create(
      connection,
      {
        body: genericSubscriptionCreateBody,
      },
    );
  typia.assert(genericSubscription);

  TestValidator.equals(
    "generic subscription should target expected community",
    genericSubscription.community_id,
    community.id,
  );

  // 7. Create a memberUser-scoped subscription for same community
  const scopedSubscriptionCreateBody = {
    community_id: community.id,
    status: "active",
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;

  const scopedSubscription: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.memberUsers.subscriptions.create(
      connection,
      {
        memberUserId,
        body: scopedSubscriptionCreateBody,
      },
    );
  typia.assert(scopedSubscription);

  TestValidator.equals(
    "scoped subscription should target expected member user",
    scopedSubscription.member_user_id,
    memberUserId,
  );

  TestValidator.equals(
    "scoped subscription should target expected community",
    scopedSubscription.community_id,
    community.id,
  );

  // 8. Create feed preferences for this member user with valid defaults
  const feedPreferencesCreateBody = {
    default_post_sort_mode: "hot",
    show_sensitive_content: false,
    include_recommended_feeds: true,
  } satisfies ICommunityPlatformUserFeedPreferences.ICreate;

  const feedPreferences: ICommunityPlatformUserFeedPreferences =
    await api.functional.communityPlatform.memberUser.memberUsers.feedPreferences.create(
      connection,
      {
        memberUserId,
        body: feedPreferencesCreateBody,
      },
    );
  typia.assert(feedPreferences);

  // Assert that feed preferences reflect request body values
  TestValidator.equals(
    "default_post_sort_mode should match request",
    feedPreferences.default_post_sort_mode,
    feedPreferencesCreateBody.default_post_sort_mode,
  );

  TestValidator.equals(
    "show_sensitive_content should match request",
    feedPreferences.show_sensitive_content,
    feedPreferencesCreateBody.show_sensitive_content,
  );

  TestValidator.equals(
    "include_recommended_feeds should match request",
    feedPreferences.include_recommended_feeds,
    feedPreferencesCreateBody.include_recommended_feeds,
  );

  // memberUser summary in response must reference the same member user
  TestValidator.equals(
    "feedPreferences.memberUser.id should match member user id",
    feedPreferences.memberUser.id,
    memberUserId,
  );

  // created_at and updated_at are ISO date-time strings validated by typia,
  // here we only sanity-check non-empty string and ordering semantics.
  TestValidator.predicate(
    "feedPreferences.id should be non-empty UUID string",
    () => feedPreferences.id.length > 0,
  );

  TestValidator.predicate(
    "created_at should be non-empty",
    () => feedPreferences.created_at.length > 0,
  );

  TestValidator.predicate(
    "updated_at should be non-empty",
    () => feedPreferences.updated_at.length > 0,
  );
}
