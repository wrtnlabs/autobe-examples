import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformHomeFeed } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformHomeFeed";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostState } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostState";
import type { ICommunityPlatformPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostType";
import type { ICommunityPlatformUserFeedPreferences } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserFeedPreferences";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";

/**
 * Validate that member user feed preference updates succeed and that home feed
 * retrieval works under different preference configurations.
 *
 * Business context:
 *
 * - A member user joins the platform, creates a community, subscribes to it, and
 *   creates several posts in that community.
 * - The user then updates their feed preferences twice using
 *   /communityPlatform/memberUser/memberUsers/{memberUserId}/feedPreferences,
 *   adjusting default_post_sort_mode, show_sensitive_content, and
 *   include_recommended_feeds.
 * - After each preference update, the user fetches the personalized home feed via
 *   PATCH /communityPlatform/memberUser/feeds/home.
 *
 * Because the actual ranking semantics (e.g., "hot" vs "new") and sensitive
 * content handling are not exposed through DTOs, the test does not attempt to
 * validate exact ordering or content inclusion. Instead, it ensures that:
 *
 * - All prerequisite operations (join, community creation, subscription, post
 *   creation) succeed and return correctly typed DTOs.
 * - Both feed preference updates succeed and return
 *   ICommunityPlatformUserFeedPreferences reflecting the requested flags.
 * - Home feed retrieval works for both preference configurations and returns a
 *   valid IPageICommunityPlatformPost.ISummary structure.
 */
export async function test_api_member_user_feed_preferences_respect_sort_mode_and_flags(
  connection: api.IConnection,
) {
  // 1. Register a new member user
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: "https://example.com/join",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const authorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(authorized);

  const memberUserId = authorized.id;

  // 2. Create a community as that member user
  const communityCreateBody = {
    identifier: `community-${RandomGenerator.alphaNumeric(8)}`,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibilityLevelCode: "public",
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreateBody },
    );
  typia.assert<ICommunityPlatformCommunity>(community);

  // 3. Subscribe the member user to the created community
  const subscriptionBody = {
    community_id: community.id,
    status: "active",
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;

  const subscription: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.memberUsers.subscriptions.create(
      connection,
      {
        memberUserId,
        body: subscriptionBody,
      },
    );
  typia.assert<ICommunityPlatformCommunitySubscription>(subscription);
  TestValidator.equals(
    "subscription community id should match",
    subscription.community_id,
    community.id,
  );

  // 4. Create several posts in that community
  const postTypeId = typia.random<string & tags.Format<"uuid">>();

  const posts: ICommunityPlatformPost[] = await ArrayUtil.asyncRepeat(
    5,
    async (index) => {
      const postBody = {
        community_id: community.id,
        post_type_id: postTypeId,
        title: `Post ${index + 1} - ${RandomGenerator.paragraph({
          sentences: 2,
        })}`,
        body: RandomGenerator.paragraph({ sentences: 8 }),
      } satisfies ICommunityPlatformPost.ICreate;

      const post: ICommunityPlatformPost =
        await api.functional.communityPlatform.memberUser.posts.create(
          connection,
          { body: postBody },
        );
      typia.assert<ICommunityPlatformPost>(post);
      return post;
    },
  );

  TestValidator.predicate(
    "at least one post should be created",
    posts.length > 0,
  );

  // 5. Update feed preferences: first configuration
  const firstPreferencesBody = {
    default_post_sort_mode: "new",
    show_sensitive_content: false,
    include_recommended_feeds: false,
  } satisfies ICommunityPlatformUserFeedPreferences.IUpdate;

  const firstPreferences: ICommunityPlatformUserFeedPreferences =
    await api.functional.communityPlatform.memberUser.memberUsers.feedPreferences.update(
      connection,
      {
        memberUserId,
        body: firstPreferencesBody,
      },
    );
  typia.assert<ICommunityPlatformUserFeedPreferences>(firstPreferences);

  TestValidator.equals(
    "first preferences default_post_sort_mode should be 'new'",
    firstPreferences.default_post_sort_mode,
    firstPreferencesBody.default_post_sort_mode,
  );
  TestValidator.equals(
    "first preferences show_sensitive_content should be false",
    firstPreferences.show_sensitive_content,
    firstPreferencesBody.show_sensitive_content,
  );
  TestValidator.equals(
    "first preferences include_recommended_feeds should be false",
    firstPreferences.include_recommended_feeds,
    firstPreferencesBody.include_recommended_feeds,
  );

  // 6. Retrieve home feed with first configuration
  const firstHomeFeedRequest = {
    page: 1 as number & tags.Type<"int32">,
    limit: 20 as number & tags.Type<"int32">,
    sort_mode: firstPreferences.default_post_sort_mode,
    time_range: undefined,
    content_type_codes: undefined,
    include_recommended: firstPreferences.include_recommended_feeds,
    feed_code: undefined,
  } satisfies ICommunityPlatformHomeFeed.IRequest;

  const firstHomeFeed: IPageICommunityPlatformPost.ISummary =
    await api.functional.communityPlatform.memberUser.feeds.home.index(
      connection,
      {
        body: firstHomeFeedRequest,
      },
    );
  typia.assert<IPageICommunityPlatformPost.ISummary>(firstHomeFeed);

  TestValidator.predicate(
    "first home feed pagination current page should be 1",
    firstHomeFeed.pagination.current === 1,
  );

  // 7. Update feed preferences: second configuration
  const secondPreferencesBody = {
    default_post_sort_mode: "hot",
    show_sensitive_content: true,
    include_recommended_feeds: true,
  } satisfies ICommunityPlatformUserFeedPreferences.IUpdate;

  const secondPreferences: ICommunityPlatformUserFeedPreferences =
    await api.functional.communityPlatform.memberUser.memberUsers.feedPreferences.update(
      connection,
      {
        memberUserId,
        body: secondPreferencesBody,
      },
    );
  typia.assert<ICommunityPlatformUserFeedPreferences>(secondPreferences);

  TestValidator.equals(
    "second preferences default_post_sort_mode should be 'hot'",
    secondPreferences.default_post_sort_mode,
    secondPreferencesBody.default_post_sort_mode,
  );
  TestValidator.equals(
    "second preferences show_sensitive_content should be true",
    secondPreferences.show_sensitive_content,
    secondPreferencesBody.show_sensitive_content,
  );
  TestValidator.equals(
    "second preferences include_recommended_feeds should be true",
    secondPreferences.include_recommended_feeds,
    secondPreferencesBody.include_recommended_feeds,
  );

  // 8. Retrieve home feed with second configuration
  const secondHomeFeedRequest = {
    page: 1 as number & tags.Type<"int32">,
    limit: 20 as number & tags.Type<"int32">,
    sort_mode: secondPreferences.default_post_sort_mode,
    time_range: undefined,
    content_type_codes: undefined,
    include_recommended: secondPreferences.include_recommended_feeds,
    feed_code: undefined,
  } satisfies ICommunityPlatformHomeFeed.IRequest;

  const secondHomeFeed: IPageICommunityPlatformPost.ISummary =
    await api.functional.communityPlatform.memberUser.feeds.home.index(
      connection,
      {
        body: secondHomeFeedRequest,
      },
    );
  typia.assert<IPageICommunityPlatformPost.ISummary>(secondHomeFeed);

  // Soft check: the second call should also return a valid page structure
  TestValidator.equals(
    "second home feed pagination current page should be 1",
    secondHomeFeed.pagination.current,
    1,
  );

  // Soft check: ensure both feeds are structurally valid pages, even if
  // specific ordering or content differences are not asserted.
  TestValidator.predicate(
    "first home feed data array should be defined",
    Array.isArray(firstHomeFeed.data),
  );
  TestValidator.predicate(
    "second home feed data array should be defined",
    Array.isArray(secondHomeFeed.data),
  );
}
