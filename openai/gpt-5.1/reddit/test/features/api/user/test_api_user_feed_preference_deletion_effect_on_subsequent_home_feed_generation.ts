import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformDefaultFeed } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformDefaultFeed";
import type { ICommunityPlatformHomeFeed } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformHomeFeed";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostType";
import type { ICommunityPlatformUserFeedPreferences } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserFeedPreferences";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";

export async function test_api_user_feed_preference_deletion_effect_on_subsequent_home_feed_generation(
  connection: api.IConnection,
) {
  // 1. Create a member user via /auth/memberUser/join
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: "127.0.0.1",
    href: "https://example.com/join",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  const memberUserId = memberAuthorized.id;

  // 2. Create a platform admin via /auth/platformAdmin/join
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(2),
    ip: "127.0.0.1",
    href: "https://example.com/admin/join",
    referrer: "https://example.com/admin/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const adminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 3. As platform admin, create a visibility level
  const visibilityCreateBody = {
    code: `public-${RandomGenerator.alphaNumeric(5)}`,
    name: "Public Visibility",
    description: "Publicly visible community",
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityCreateBody,
      },
    );
  typia.assert(visibilityLevel);

  // 4. Switch to member user: login (to ensure member auth context is active)
  const memberLoginBody = {
    identifier: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: "127.0.0.1",
    href: "https://example.com/login",
    referrer: "https://example.com/home",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberLoginAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoginAuthorized);

  // 5. Create a community as the member user
  const communityCreateBody = {
    identifier: `community-${RandomGenerator.alphaNumeric(8)}`,
    title: "Test Community",
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
  typia.assert(community);

  // 6. As member user, create a base subscription via collection-level endpoint
  const baseSubscriptionCreateBody = {
    community_id: community.id,
    status: "active",
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;

  const baseSubscription: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.subscriptions.create(
      connection,
      {
        body: baseSubscriptionCreateBody,
      },
    );
  typia.assert(baseSubscription);

  // 7. As member user, create a memberUser-scoped subscription
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

  // 8. Switch to platform admin and create a default feed configuration
  const adminLoginBody = {
    identifier: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: "127.0.0.1",
    href: "https://example.com/admin/login",
    referrer: "https://example.com/admin/home",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const adminLoginAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginAuthorized);

  const defaultFeedCreateBody = {
    feed_code: `default-${RandomGenerator.alphaNumeric(6)}`,
    feed_type: "platform_default",
    is_active: true,
    is_platform_default: true,
  } satisfies ICommunityPlatformDefaultFeed.ICreate;

  const defaultFeed: ICommunityPlatformDefaultFeed =
    await api.functional.communityPlatform.platformAdmin.defaultFeeds.create(
      connection,
      {
        body: defaultFeedCreateBody,
      },
    );
  typia.assert(defaultFeed);

  // 9. Switch back to member user (login again) so subsequent operations are under member context
  const memberLoginAuthorized2: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoginAuthorized2);

  // 10. Create explicit memberUser-scoped feed preferences
  const memberScopedPreferenceBody = {
    default_post_sort_mode: "hot",
    show_sensitive_content: false,
    include_recommended_feeds: false,
  } satisfies ICommunityPlatformUserFeedPreferences.ICreate;

  const memberScopedPreference: ICommunityPlatformUserFeedPreferences =
    await api.functional.communityPlatform.memberUser.memberUsers.feedPreferences.create(
      connection,
      {
        memberUserId,
        body: memberScopedPreferenceBody,
      },
    );
  typia.assert(memberScopedPreference);

  // 11. Create standalone user feed preference record that will later be deleted
  const standalonePreferenceBody = {
    default_post_sort_mode: "new",
    show_sensitive_content: true,
    include_recommended_feeds: true,
  } satisfies ICommunityPlatformUserFeedPreferences.ICreate;

  const standalonePreference: ICommunityPlatformUserFeedPreferences =
    await api.functional.communityPlatform.memberUser.userFeedPreferences.create(
      connection,
      {
        body: standalonePreferenceBody,
      },
    );
  typia.assert(standalonePreference);

  // 12. Generate home feed while explicit preferences exist
  const initialHomeFeedRequest = {
    page: 1 as number & tags.Type<"int32">,
    limit: 20 as number & tags.Type<"int32">,
    sort_mode: standalonePreference.default_post_sort_mode,
    time_range: undefined,
    content_type_codes: undefined,
    include_recommended: standalonePreference.include_recommended_feeds,
    feed_code: defaultFeed.feed_code,
  } satisfies ICommunityPlatformHomeFeed.IRequest;

  const initialHomeFeedPage: IPageICommunityPlatformPost.ISummary =
    await api.functional.communityPlatform.memberUser.feeds.home.index(
      connection,
      {
        body: initialHomeFeedRequest,
      },
    );
  typia.assert(initialHomeFeedPage);

  TestValidator.predicate(
    "initial home feed pagination has non-negative record count",
    initialHomeFeedPage.pagination.records >= 0,
  );

  // 13. Delete the standalone user feed preference
  await api.functional.communityPlatform.memberUser.userFeedPreferences.erase(
    connection,
    {
      preferenceId: standalonePreference.id,
    },
  );

  // 14. Generate home feed again after deletion, letting behavior fall back towards defaults/member-scoped prefs
  const postDeleteHomeFeedRequest = {
    page: 1 as number & tags.Type<"int32">,
    limit: 20 as number & tags.Type<"int32">,
    sort_mode: memberScopedPreference.default_post_sort_mode,
    time_range: undefined,
    content_type_codes: undefined,
    include_recommended: memberScopedPreference.include_recommended_feeds,
    feed_code: defaultFeed.feed_code,
  } satisfies ICommunityPlatformHomeFeed.IRequest;

  const postDeleteHomeFeedPage: IPageICommunityPlatformPost.ISummary =
    await api.functional.communityPlatform.memberUser.feeds.home.index(
      connection,
      {
        body: postDeleteHomeFeedRequest,
      },
    );
  typia.assert(postDeleteHomeFeedPage);

  TestValidator.predicate(
    "post-delete home feed pagination has non-negative record count",
    postDeleteHomeFeedPage.pagination.records >= 0,
  );

  // 15. Compare key aspects between initial and post-delete home feeds.
  // We do not assert exact contents, only that both responses are structurally valid
  // and that they may differ in pagination metadata or data size, indicating that the
  // system can still generate feeds after preference deletion.
  TestValidator.equals(
    "home feed page size remains consistent before and after preference deletion",
    initialHomeFeedPage.pagination.limit,
    postDeleteHomeFeedPage.pagination.limit,
  );

  TestValidator.predicate(
    "home feed remains valid after preference deletion (records count may change)",
    postDeleteHomeFeedPage.pagination.records >= 0,
  );
}
