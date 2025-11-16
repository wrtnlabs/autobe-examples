import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformDefaultFeed } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformDefaultFeed";
import type { ICommunityPlatformHomeFeed } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformHomeFeed";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostState } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostState";
import type { ICommunityPlatformPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostType";
import type { ICommunityPlatformUserFeedPreferences } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserFeedPreferences";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";

/**
 * Verify that a member user's home feed falls back to platform default feeds
 * when the user has no community subscriptions.
 *
 * Business context:
 *
 * - New or unsubscribed users should still see content on their home feed.
 * - The platform can configure default feeds (via
 *   community_platform_default_feeds) and per-user feed preferences that allow
 *   recommended/default feeds.
 * - When such configuration exists and the user has no subscriptions, the home
 *   feed should not be empty; it should surface posts that are eligible
 *   according to default feed rules and visibility constraints.
 *
 * End-to-end steps:
 *
 * 1. Register member user A (the test subject) via /auth/memberUser/join.
 * 2. Register member user B (content author) via /auth/memberUser/join.
 * 3. Register platform admin via /auth/platformAdmin/join.
 * 4. As platform admin, create a community visibility level.
 * 5. As member user B, create a community using that visibility level.
 * 6. As platform admin, create a post type.
 * 7. As member user B, create several posts in the community with that post type.
 * 8. As platform admin, create an active, platform-default feed configuration.
 * 9. As member user A, create feed preferences with
 *    include_recommended_feeds=true.
 * 10. As member user A, call PATCH /communityPlatform/memberUser/feeds/home with
 *     page=1, limit=10 (int32), sort_mode="hot", and no extra filters.
 * 11. Assert that the returned page has at least one post and that pagination
 *     metadata reports one or more records.
 * 12. Sanity-check that returned posts have coherent community, author, and post
 *     type summaries, indirectly confirming that content from the created
 *     community/post type flows into the home feed via default/recommended feed
 *     logic.
 */
export async function test_api_home_feed_fallback_to_default_feeds_when_no_subscriptions(
  connection: api.IConnection,
) {
  // 1. Register member user A (test subject)
  const memberAJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password123!",
    ip: null,
    href: "https://example.com/join",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;
  const memberA: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberAJoinBody,
    });
  typia.assert(memberA);

  // 2. Register member user B (content author)
  const memberBJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password123!",
    ip: null,
    href: "https://example.com/join",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;
  const memberB: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberBJoinBody,
    });
  typia.assert(memberB);

  // 3. Register a platform admin and keep their credentials for later logins if needed
  const adminJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPassword123!",
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://example.com/admin/join",
    referrer: "https://example.com/admin/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;
  const platformAdmin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(platformAdmin);

  // 4. As platform admin, create a community visibility level
  //    (join has already set the Authorization header for platformAdmin)
  const visibilityCode = `public_${RandomGenerator.alphabets(6)}`;
  const visibilityBody = {
    code: visibilityCode,
    name: "Public Visibility",
    description: "Visible to all members",
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;
  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: visibilityBody },
    );
  typia.assert(visibilityLevel);

  // 5. Switch to member user B and create a community using that visibility level
  const memberBLoginBody = {
    identifier: memberB.email,
    password: memberBJoinBody.password,
    ip: "127.0.0.1",
    href: "https://example.com/login",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;
  const memberBLogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberBLoginBody,
    });
  typia.assert(memberBLogin);

  const communityIdentifier = `community_${RandomGenerator.alphabets(8)}`;
  const communityBody = {
    identifier: communityIdentifier,
    title: "Default Feed Community",
    description: "Community for default feed testing",
    visibilityLevelCode: visibilityCode,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityBody },
    );
  typia.assert(community);

  // 6. Switch back to platform admin and create a post type
  const adminLoginBody = {
    identifier: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: "127.0.0.1",
    href: "https://example.com/admin/login",
    referrer: "https://example.com/admin/landing",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;
  const adminLogin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);

  const postTypeCode = `text_${RandomGenerator.alphabets(6)}`;
  const postTypeBody = {
    code: postTypeCode,
    name: "Text Post",
    description: "Simple text posts for default feed tests",
  } satisfies ICommunityPlatformPostType.ICreate;
  const postType: ICommunityPlatformPostType =
    await api.functional.communityPlatform.platformAdmin.postTypes.create(
      connection,
      { body: postTypeBody },
    );
  typia.assert(postType);

  // 7. Switch to member user B again and create several posts
  const memberBLoginAgain: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberBLoginBody,
    });
  typia.assert(memberBLoginAgain);

  const postCount = 3;
  const createdPosts: ICommunityPlatformPost[] = await ArrayUtil.asyncRepeat(
    postCount,
    async (index) => {
      const createPostBody = {
        community_id: community.id,
        post_type_id: postType.id,
        title: `Seed Post ${index + 1}`,
        body: RandomGenerator.paragraph({ sentences: 5 }),
        url: null,
        image_uri: null,
      } satisfies ICommunityPlatformPost.ICreate;
      const post: ICommunityPlatformPost =
        await api.functional.communityPlatform.memberUser.posts.create(
          connection,
          { body: createPostBody },
        );
      typia.assert(post);
      return post;
    },
  );

  TestValidator.equals(
    "created posts count should match",
    createdPosts.length,
    postCount,
  );

  // 8. Switch to platform admin and create a default feed configuration
  const adminLoginAgain: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginAgain);

  const defaultFeedCode = `default_${RandomGenerator.alphabets(6)}`;
  const defaultFeedBody = {
    feed_code: defaultFeedCode,
    feed_type: "onboarding",
    is_active: true,
    is_platform_default: true,
  } satisfies ICommunityPlatformDefaultFeed.ICreate;
  const defaultFeed: ICommunityPlatformDefaultFeed =
    await api.functional.communityPlatform.platformAdmin.defaultFeeds.create(
      connection,
      { body: defaultFeedBody },
    );
  typia.assert(defaultFeed);

  // 9. Switch to member user A and configure feed preferences to include recommended feeds
  const memberALoginBody = {
    identifier: memberA.email,
    password: memberAJoinBody.password,
    ip: "127.0.0.1",
    href: "https://example.com/login",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;
  const memberALogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberALoginBody,
    });
  typia.assert(memberALogin);

  const feedPreferencesBody = {
    default_post_sort_mode: "hot",
    show_sensitive_content: false,
    include_recommended_feeds: true,
  } satisfies ICommunityPlatformUserFeedPreferences.ICreate;
  const feedPreferences: ICommunityPlatformUserFeedPreferences =
    await api.functional.communityPlatform.memberUser.memberUsers.feedPreferences.create(
      connection,
      {
        memberUserId: memberALogin.id,
        body: feedPreferencesBody,
      },
    );
  typia.assert(feedPreferences);

  TestValidator.equals(
    "feed preferences should include recommended feeds",
    feedPreferences.include_recommended_feeds,
    true,
  );

  // 10. Call the home feed endpoint as member user A
  const pageValue = typia.random<number & tags.Type<"int32">>();
  const limitValue = typia.random<number & tags.Type<"int32">>();
  const homeFeedRequest = {
    page: pageValue,
    limit: limitValue,
    sort_mode: feedPreferences.default_post_sort_mode,
  } satisfies ICommunityPlatformHomeFeed.IRequest;

  const homeFeedPage: IPageICommunityPlatformPost.ISummary =
    await api.functional.communityPlatform.memberUser.feeds.home.index(
      connection,
      { body: homeFeedRequest },
    );
  typia.assert(homeFeedPage);

  const pagination: IPage.IPagination = homeFeedPage.pagination;
  typia.assert(pagination);

  // 11. Assert that the feed is not empty
  TestValidator.predicate(
    "home feed should have at least one record when default feeds are configured",
    pagination.records > 0 && homeFeedPage.data.length > 0,
  );

  // 12. Sanity check: each post summary has coherent community/author/post_type
  await ArrayUtil.asyncForEach(homeFeedPage.data, async (summary, index) => {
    typia.assert(summary);

    TestValidator.predicate(
      `post ${index} should have a community summary`,
      summary.community !== undefined && summary.community !== null,
    );

    TestValidator.predicate(
      `post ${index} should have an author summary`,
      summary.author !== undefined && summary.author !== null,
    );

    TestValidator.predicate(
      `post ${index} should have a post type summary`,
      summary.post_type !== undefined && summary.post_type !== null,
    );
  });
}
