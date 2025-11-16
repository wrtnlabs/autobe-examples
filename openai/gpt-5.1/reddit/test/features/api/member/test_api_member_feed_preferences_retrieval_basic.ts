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
 * Verify that a member user can initialize and then retrieve their feed
 * preferences.
 *
 * Business context: A member’s home feed behavior is controlled by a per-user
 * preferences row (default_post_sort_mode, show_sensitive_content,
 * include_recommended_feeds) stored in
 * community_platform_user_feed_preferences. The member can create communities
 * and subscribe to them, and then configure their feed preferences. The generic
 * PATCH /communityPlatform/memberUser/userFeedPreferences endpoint should then
 * return the effective preferences for the authenticated user.
 *
 * Steps:
 *
 * 1. Register a new member user via /auth/memberUser/join, capturing their id and
 *    username for later comparison.
 * 2. Register a platform admin via /auth/platformAdmin/join to obtain a
 *    platformAdmin actor, which is allowed to define community visibility
 *    levels.
 * 3. As platformAdmin, create a new visibility level using
 *    /communityPlatform/platformAdmin/communityVisibilityLevels with a unique
 *    code and name.
 * 4. Switch authentication back to the member user using /auth/memberUser/login so
 *    subsequent operations run as that member.
 * 5. As the member, create a new community with
 *    /communityPlatform/memberUser/communities, referencing the visibility
 *    level code from step 3.
 * 6. As the member, subscribe to that community with
 *    /communityPlatform/memberUser/subscriptions, referencing the created
 *    community_id and providing an initial status (e.g. "active").
 * 7. As the same member, call
 *    /communityPlatform/memberUser/memberUsers/{memberUserId}/feedPreferences
 *    with an ICommunityPlatformUserFeedPreferences.ICreate body, choosing
 *    specific values for default_post_sort_mode, show_sensitive_content, and
 *    include_recommended_feeds. Use the member’s id from step 1 as path param.
 * 8. Finally, call PATCH /communityPlatform/memberUser/userFeedPreferences with an
 *    ICommunityPlatformUserFeedPreferences.IRequest body (optionally including
 *    small page/limit values) to retrieve the effective preferences for the
 *    current user.
 *
 * Assertions:
 *
 * - Each non-void response is validated with typia.assert to guarantee DTO schema
 *   conformance.
 * - The preferences returned by PATCH match the values configured in step 7 for
 *   default_post_sort_mode, show_sensitive_content, and
 *   include_recommended_feeds using TestValidator.equals.
 * - The memberUser summary embedded in the retrieved preferences has the same id
 *   and username as the original IAuthorized payload from join/login.
 */
export async function test_api_member_feed_preferences_retrieval_basic(
  connection: api.IConnection,
) {
  // 1. Member joins
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: "https://member.example.com/join",
    referrer: "https://member.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;
  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  const memberId = memberAuthorized.id;
  const memberUsername = memberAuthorized.username;

  // 2. Platform admin joins
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;
  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 3. Create visibility level as platformAdmin
  const visibilityCode = `public-${RandomGenerator.alphaNumeric(8)}`;
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

  // 4. Switch back to member user via login to ensure member auth context
  const memberLoginBody = {
    identifier: memberJoinBody.email,
    password: memberJoinBody.password,
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;
  const memberLoginAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoginAuthorized);

  // 5. Create a community as member
  const communityIdentifier = `test-community-${RandomGenerator.alphaNumeric(6)}`;
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: "Test Member Feed Community",
    description: RandomGenerator.paragraph({ sentences: 8 }),
    visibilityLevelCode: visibilityLevel.code,
    isNsfw: false,
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  // 6. Subscribe the member to the community
  const subscriptionCreateBody = {
    community_id: community.id,
    status: "active",
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;
  const subscription: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.subscriptions.create(
      connection,
      {
        body: subscriptionCreateBody,
      },
    );
  typia.assert(subscription);

  // 7. Initialize feed preferences for the member
  const initialPreferencesCreateBody = {
    default_post_sort_mode: "hot",
    show_sensitive_content: false,
    include_recommended_feeds: true,
  } satisfies ICommunityPlatformUserFeedPreferences.ICreate;
  const createdPreferences: ICommunityPlatformUserFeedPreferences =
    await api.functional.communityPlatform.memberUser.memberUsers.feedPreferences.create(
      connection,
      {
        memberUserId: memberId,
        body: initialPreferencesCreateBody,
      },
    );
  typia.assert(createdPreferences);

  // 8. Retrieve effective preferences via PATCH index endpoint
  const requestBody = {
    page: 1 as number & tags.Type<"int32">,
    limit: 1 as number & tags.Type<"int32">,
  } satisfies ICommunityPlatformUserFeedPreferences.IRequest;
  const retrievedPreferences: ICommunityPlatformUserFeedPreferences =
    await api.functional.communityPlatform.memberUser.userFeedPreferences.index(
      connection,
      {
        body: requestBody,
      },
    );
  typia.assert(retrievedPreferences);

  // Assertions on preference fields
  TestValidator.equals(
    "default_post_sort_mode should match initialized value",
    retrievedPreferences.default_post_sort_mode,
    initialPreferencesCreateBody.default_post_sort_mode,
  );
  TestValidator.equals(
    "show_sensitive_content should match initialized value",
    retrievedPreferences.show_sensitive_content,
    initialPreferencesCreateBody.show_sensitive_content,
  );
  TestValidator.equals(
    "include_recommended_feeds should match initialized value",
    retrievedPreferences.include_recommended_feeds,
    initialPreferencesCreateBody.include_recommended_feeds,
  );

  // Assertions on memberUser association
  TestValidator.equals(
    "memberUser.id in preferences should match authenticated member id",
    retrievedPreferences.memberUser.id,
    memberId,
  );
  TestValidator.equals(
    "memberUser.username in preferences should match authenticated member username",
    retrievedPreferences.memberUser.username,
    memberUsername,
  );
}
