import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformFeedPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeedPost";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformFeedPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformFeedPost";

/**
 * Validate that the memberUser feed endpoint returns posts personalized by
 * community subscriptions.
 *
 * Business goal: a signed-in member should primarily see posts from communities
 * they have subscribed to when using a personalized feed mode such as "home" or
 * "subscriptions". Communities that the user has not subscribed to should not
 * appear when recommendations are disabled.
 *
 * Scenario steps implemented in this test:
 *
 * 1. Register a fresh member user via POST /auth/memberUser/join to obtain an
 *    authenticated context (IAuthorized with IAuthorizationToken). The SDK
 *    join() call wires the Authorization header automatically for subsequent
 *    requests.
 * 2. As that authenticated memberUser, create two distinct communities using POST
 *    /communityPlatform/memberUser/communities, each with different slugs and
 *    names so that we can distinguish them later in assertions.
 * 3. For each community, create at least one post via POST
 *    /communityPlatform/memberUser/posts using ICommunityPlatformPost.ICreate:
 *
 *    - CommunityId: the created community.id
 *    - CommunityCode: the created community.slug
 *    - Title/body populated with random content using RandomGenerator.
 * 4. Create a subscription for only the first community using POST
 *    /communityPlatform/memberUser/subscriptions with
 *    ICommunityPlatformCommunitySubscription.ICreate:
 *
 *    - Community_platform_community_id: firstCommunity.id
 *    - Is_active: true
 *    - Receive_notifications: true.
 * 5. Build a feed request body ICommunityPlatformFeedPost.IRequest targeting a
 *    personalized mode:
 *
 *    - Mode: "subscriptions" to restrict content to subscribed communities
 *    - SortMode: "new" so that freshly created posts appear in the result
 *    - IncludeRecommended: false to avoid discovery content from non-subscribed
 *         communities
 *    - Page: 1, pageSize: a small positive int to cover our posts.
 * 6. Call PATCH /communityPlatform/memberUser/feeds/posts via
 *    api.functional.communityPlatform.memberUser.feeds.posts.index with the
 *    constructed IRequest body and the authenticated connection.
 * 7. Validate the response as follows:
 *
 *    - Typia.assert on the returned IPageICommunityPlatformFeedPost.ISummary to
 *         guarantee structural correctness.
 *    - Ensure that at least one feed item originates from the subscribed community
 *         (community.id === firstCommunity.id for some item).
 *    - Ensure that no feed items originate from the non-subscribed community when
 *         includeRecommended is false and mode is "subscriptions".
 * 8. Then subscribe the member to the second community as well, call the feed
 *    again with the same IRequest payload, and assert that at least one feed
 *    item from the second community appears, reinforcing that subscriptions
 *    drive feed composition.
 */
export async function test_api_member_feed_personalized_by_subscriptions(
  connection: api.IConnection,
) {
  // 1. Register a fresh member user to establish an authenticated context.
  const joinInput = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    ip: null,
    href: "https://community.example.com/register",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const member: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinInput,
    });
  typia.assert(member);

  // 2. Create two distinct communities as this member user.
  const communityAInput = {
    slug: `community-a-${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibility: "public",
    status: "active",
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: false,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const communityA: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityAInput },
    );
  typia.assert(communityA);

  const communityBInput = {
    slug: `community-b-${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibility: "public",
    status: "active",
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: false,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const communityB: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityBInput },
    );
  typia.assert(communityB);

  // 3. Create at least one post in each community.
  const postAInput = {
    communityId: communityA.id,
    communityCode: communityA.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 1 }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const postA: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postAInput,
    });
  typia.assert(postA);

  const postBInput = {
    communityId: communityB.id,
    communityCode: communityB.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 1 }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const postB: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postBInput,
    });
  typia.assert(postB);

  // 4. Subscribe the memberUser only to community A.
  const subscriptionAInput = {
    community_platform_community_id: communityA.id,
    is_active: true,
    receive_notifications: true,
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;

  const subscriptionA: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.subscriptions.create(
      connection,
      { body: subscriptionAInput },
    );
  typia.assert(subscriptionA);

  // 5. Prepare a feed request for subscription-based personalized feed.
  const feedRequest1 = {
    page: 1 as number & tags.Type<"int32">,
    pageSize: 20 as number & tags.Type<"int32">,
    cursor: undefined,
    sortMode: "new" as const,
    timeRange: undefined,
    mode: "subscriptions" as const,
    communityIds: undefined,
    includeNsfw: false,
    includeRecommended: false,
  } satisfies ICommunityPlatformFeedPost.IRequest;

  // 6. Call the feed endpoint.
  const page1: IPageICommunityPlatformFeedPost.ISummary =
    await api.functional.communityPlatform.memberUser.feeds.posts.index(
      connection,
      { body: feedRequest1 },
    );
  typia.assert(page1);

  // 7a. Ensure at least one item from the subscribed community appears.
  const fromCommunityA: ICommunityPlatformFeedPost.ISummary[] =
    page1.data.filter(
      (item) =>
        item.community !== undefined && item.community.id === communityA.id,
    );

  TestValidator.predicate(
    "feed should contain posts from the subscribed community A",
    fromCommunityA.length > 0,
  );

  // 7b. Ensure no items from the non-subscribed community B appear
  //     when mode=subscriptions and includeRecommended=false.
  const fromCommunityB: ICommunityPlatformFeedPost.ISummary[] =
    page1.data.filter(
      (item) =>
        item.community !== undefined && item.community.id === communityB.id,
    );

  TestValidator.equals(
    "feed should not contain posts from non-subscribed community B",
    fromCommunityB.length,
    0,
  );

  // 8. Subscribe to community B as well and verify that its posts appear
  //    in a subsequent feed call.
  const subscriptionBInput = {
    community_platform_community_id: communityB.id,
    is_active: true,
    receive_notifications: true,
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;

  const subscriptionB: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.subscriptions.create(
      connection,
      { body: subscriptionBInput },
    );
  typia.assert(subscriptionB);

  const feedRequest2 = {
    page: 1 as number & tags.Type<"int32">,
    pageSize: 20 as number & tags.Type<"int32">,
    cursor: undefined,
    sortMode: "new" as const,
    timeRange: undefined,
    mode: "subscriptions" as const,
    communityIds: undefined,
    includeNsfw: false,
    includeRecommended: false,
  } satisfies ICommunityPlatformFeedPost.IRequest;

  const page2: IPageICommunityPlatformFeedPost.ISummary =
    await api.functional.communityPlatform.memberUser.feeds.posts.index(
      connection,
      { body: feedRequest2 },
    );
  typia.assert(page2);

  const fromCommunityBAfterSub: ICommunityPlatformFeedPost.ISummary[] =
    page2.data.filter(
      (item) =>
        item.community !== undefined && item.community.id === communityB.id,
    );

  TestValidator.predicate(
    "after subscribing to community B, its posts should appear in the feed",
    fromCommunityBAfterSub.length > 0,
  );
}
