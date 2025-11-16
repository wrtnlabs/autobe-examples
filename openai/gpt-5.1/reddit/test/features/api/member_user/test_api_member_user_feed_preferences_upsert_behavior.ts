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
 * Validate upsert semantics for per-member feed preferences.
 *
 * This test ensures that POST
 * /communityPlatform/memberUser/memberUsers/{memberUserId}/feedPreferences
 * behaves like an upsert for the same member user:
 *
 * - First call creates a preferences record
 * - Second call updates the existing record, preserving id and created_at while
 *   changing updated_at and preference values.
 *
 * Business flow:
 *
 * 1. Register a member user (auth.memberUser.join) and obtain their id.
 * 2. Register a platform admin and create a visibility level
 *    (platformAdmin.communityVisibilityLevels.create).
 * 3. As the member user, create a community using that visibility level
 *    (memberUser.communities.create).
 * 4. As the member user, create a generic community subscription
 *    (memberUser.subscriptions.create).
 * 5. As the member user, create a memberUser-scoped subscription
 *    (memberUser.memberUsers.subscriptions.create) for the same community.
 * 6. As the same member user, call memberUsers.feedPreferences.create with
 *    configuration A and capture the returned preferences.
 * 7. Call memberUsers.feedPreferences.create again with configuration B.
 *
 * Assertions:
 *
 * - Both responses are valid ICommunityPlatformUserFeedPreferences.
 * - The second response has the same id as the first (single record per user).
 * - Created_at is identical across both responses.
 * - Updated_at changes between calls (second >= first).
 * - Preference fields in the second response reflect configuration B.
 */
export async function test_api_member_user_feed_preferences_upsert_behavior(
  connection: api.IConnection,
) {
  // 1. Register a member user (this also authenticates them and sets Authorization header)
  const joinMemberBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://member.example.com/join",
    referrer: "https://member.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuth: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinMemberBody,
    });
  typia.assert(memberAuth);

  const memberUserId = memberAuth.id;

  // 2. Register a platform admin and create a visibility level
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    ip: undefined,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const adminAuth: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuth);

  const visibilityCode = `vis_${RandomGenerator.alphaNumeric(6)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public Visibility",
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibility: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityCreateBody,
      },
    );
  typia.assert(visibility);
  TestValidator.equals(
    "visibility code should match the requested code",
    visibility.code,
    visibilityCreateBody.code,
  );

  // 3. Switch back to member user by logging in with their credentials
  const memberLoginBody = {
    identifier: joinMemberBody.email,
    password: joinMemberBody.password,
    ip: null,
    href: "https://member.example.com/login",
    referrer: "https://member.example.com/home",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberLoginAuth: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoginAuth);
  TestValidator.equals(
    "logged-in member id should match joined member id",
    memberLoginAuth.id,
    memberUserId,
  );

  // 4. Create a community using that visibility level
  const communityCreateBody = {
    identifier: `community_${RandomGenerator.alphaNumeric(8)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    visibilityLevelCode: visibilityCode,
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
  typia.assert(community);
  TestValidator.equals(
    "community identifier should match creation payload",
    community.identifier,
    communityCreateBody.identifier,
  );
  TestValidator.equals(
    "community visibility level code should match",
    community.visibilityLevel.code,
    visibilityCode,
  );

  // 5. Create a generic subscription to that community
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
    "generic subscription community id should match community.id",
    genericSubscription.community_id,
    community.id,
  );

  // 6. Create a memberUser-scoped subscription for the same community
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
    "scoped subscription community id should match community.id",
    scopedSubscription.community_id,
    community.id,
  );

  // 7. First POST to feedPreferences with configuration A
  const configA: ICommunityPlatformUserFeedPreferences.ICreate = {
    default_post_sort_mode: "hot",
    show_sensitive_content: false,
    include_recommended_feeds: true,
  };

  const prefA: ICommunityPlatformUserFeedPreferences =
    await api.functional.communityPlatform.memberUser.memberUsers.feedPreferences.create(
      connection,
      {
        memberUserId,
        body: configA,
      },
    );
  typia.assert(prefA);

  // 8. Second POST to feedPreferences with configuration B (different values)
  const configB: ICommunityPlatformUserFeedPreferences.ICreate = {
    default_post_sort_mode: "new",
    show_sensitive_content: true,
    include_recommended_feeds: false,
  };

  const prefB: ICommunityPlatformUserFeedPreferences =
    await api.functional.communityPlatform.memberUser.memberUsers.feedPreferences.create(
      connection,
      {
        memberUserId,
        body: configB,
      },
    );
  typia.assert(prefB);

  // Core upsert assertions
  TestValidator.equals(
    "feed preferences id should remain stable between upsert calls",
    prefB.id,
    prefA.id,
  );

  TestValidator.equals(
    "created_at should remain unchanged between upsert calls",
    prefB.created_at,
    prefA.created_at,
  );

  TestValidator.predicate(
    "updated_at should change between first and second upsert calls",
    prefA.updated_at !== prefB.updated_at,
  );

  TestValidator.predicate(
    "second updated_at should be later than or equal to first",
    new Date(prefB.updated_at).getTime() >=
      new Date(prefA.updated_at).getTime(),
  );

  // Preference field assertions for configuration B
  TestValidator.equals(
    "default_post_sort_mode should reflect configuration B",
    prefB.default_post_sort_mode,
    configB.default_post_sort_mode,
  );
  TestValidator.equals(
    "show_sensitive_content should reflect configuration B",
    prefB.show_sensitive_content,
    configB.show_sensitive_content,
  );
  TestValidator.equals(
    "include_recommended_feeds should reflect configuration B",
    prefB.include_recommended_feeds,
    configB.include_recommended_feeds,
  );
}
