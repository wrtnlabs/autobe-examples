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
import type { ICommunityPlatformPostState } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostState";
import type { ICommunityPlatformPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostType";
import type { ICommunityPlatformUserFeedPreferences } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserFeedPreferences";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";

/**
 * Validate personalized home feed composition using subscriptions and user feed
 * preferences.
 *
 * This E2E test walks through the following flow:
 *
 * 1. Create a platform admin and log in for configuration APIs.
 * 2. Create a community visibility level, post type, and default feed.
 * 3. Create a member user and log in for memberUser APIs.
 * 4. Create a community with the configured visibility level.
 * 5. Create multiple posts in that community using the configured post type.
 * 6. Create a subscription from the member user to the community.
 * 7. Create user feed preferences that prefer sort_mode="hot" and include
 *    recommended feeds.
 * 8. Call the home feed endpoint and assert that returned posts belong to the
 *    subscribed community and include at least one of the authored posts, with
 *    non-empty pagination metadata.
 */
export async function test_api_home_feed_personalized_with_subscriptions_and_preferences(
  connection: api.IConnection,
) {
  // 1. Platform admin join (auto-logs in via SDK)
  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    ip: RandomGenerator.alphaNumeric(10),
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. Create a visibility level
  const visibilityCode = `public-${RandomGenerator.alphaNumeric(8)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: `Public ${RandomGenerator.name(1)}`,
    description: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibility: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: visibilityCreateBody },
    );
  typia.assert(visibility);

  // 3. Create a post type
  const postTypeCode = `text-${RandomGenerator.alphaNumeric(8)}`;
  const postTypeCreateBody = {
    code: postTypeCode,
    name: `Text ${RandomGenerator.name(1)}`,
    description: RandomGenerator.paragraph({ sentences: 8 }),
  } satisfies ICommunityPlatformPostType.ICreate;

  const postType: ICommunityPlatformPostType =
    await api.functional.communityPlatform.platformAdmin.postTypes.create(
      connection,
      { body: postTypeCreateBody },
    );
  typia.assert(postType);

  // 4. Create a default feed configuration
  const defaultFeedCode = `default-${RandomGenerator.alphaNumeric(8)}`;
  const defaultFeedCreateBody = {
    feed_code: defaultFeedCode,
    feed_type: "onboarding",
    is_active: true,
    is_platform_default: true,
  } satisfies ICommunityPlatformDefaultFeed.ICreate;

  const defaultFeed: ICommunityPlatformDefaultFeed =
    await api.functional.communityPlatform.platformAdmin.defaultFeeds.create(
      connection,
      { body: defaultFeedCreateBody },
    );
  typia.assert(defaultFeed);

  // 5. Member user join (auto-logs in via SDK)
  const memberJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    ip: RandomGenerator.alphaNumeric(10),
    href: "https://app.example.com/join",
    referrer: "https://app.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 6. Member user creates a community with the created visibility level
  const communityCreateBody = {
    identifier: `community-${RandomGenerator.alphaNumeric(8)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 10 }),
    visibilityLevelCode: visibility.code,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreateBody },
    );
  typia.assert(community);

  // 7. Member user creates multiple posts in the community
  const postCount = 3;
  const createdPosts: ICommunityPlatformPost[] = await ArrayUtil.asyncRepeat(
    postCount,
    async (index) => {
      const bodyText = RandomGenerator.content({
        paragraphs: 1,
        sentenceMin: 5,
        sentenceMax: 10,
        wordMin: 3,
        wordMax: 8,
      });
      const createPostBody = {
        community_id: community.id,
        post_type_id: postType.id,
        title: `Post #${index + 1} - ${RandomGenerator.paragraph({ sentences: 2 })}`,
        body: bodyText,
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

  // 8. Member user subscribes to the community
  const subscriptionCreateBody = {
    community_id: community.id,
    status: "active",
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;

  const subscription: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.subscriptions.create(
      connection,
      { body: subscriptionCreateBody },
    );
  typia.assert(subscription);

  TestValidator.equals(
    "subscription should target created community",
    subscription.community_id,
    community.id,
  );

  // 9. Configure user feed preferences for the member user
  const feedPreferencesBody = {
    default_post_sort_mode: "hot",
    show_sensitive_content: false,
    include_recommended_feeds: true,
  } satisfies ICommunityPlatformUserFeedPreferences.ICreate;

  const feedPreferences: ICommunityPlatformUserFeedPreferences =
    await api.functional.communityPlatform.memberUser.memberUsers.feedPreferences.create(
      connection,
      {
        memberUserId: memberAuthorized.id,
        body: feedPreferencesBody,
      },
    );
  typia.assert(feedPreferences);

  TestValidator.equals(
    "feed preferences should store default_post_sort_mode",
    feedPreferences.default_post_sort_mode,
    feedPreferencesBody.default_post_sort_mode,
  );

  TestValidator.equals(
    "feed preferences should store include_recommended_feeds",
    feedPreferences.include_recommended_feeds,
    feedPreferencesBody.include_recommended_feeds,
  );

  // 10. Call home feed endpoint with sort_mode matching preferences and
  // without overriding other optional filters, so preferences and defaults apply.
  const homeFeedRequestBody = {
    page: 1 as number & tags.Type<"int32">,
    limit: 20 as number & tags.Type<"int32">,
    sort_mode: "hot",
  } satisfies ICommunityPlatformHomeFeed.IRequest;

  const homeFeedPage: IPageICommunityPlatformPost.ISummary =
    await api.functional.communityPlatform.memberUser.feeds.home.index(
      connection,
      { body: homeFeedRequestBody },
    );
  typia.assert(homeFeedPage);

  const pagination: IPage.IPagination = homeFeedPage.pagination;
  typia.assert(pagination);

  TestValidator.predicate(
    "home feed should have at least one record",
    pagination.records > 0 && homeFeedPage.data.length > 0,
  );

  // Ensure that all posts in the feed come from the subscribed community
  TestValidator.predicate(
    "all feed posts should belong to the subscribed community",
    homeFeedPage.data.every((item) => item.community_id === community.id),
  );

  // Ensure that at least one of the created posts appears in the feed
  const createdPostIds = createdPosts.map((post) => post.id);
  const feedPostIds = homeFeedPage.data.map((summary) => summary.id);

  const hasCreatedPostInFeed = createdPostIds.some((id) =>
    feedPostIds.includes(id),
  );

  TestValidator.predicate(
    "home feed should include at least one authored post",
    hasCreatedPostInFeed,
  );
}
