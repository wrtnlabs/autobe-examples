import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserLogin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";
import type { ICommunityPlatformDiscoveryItem } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformDiscoveryItem";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformDiscoveryItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformDiscoveryItem";

/**
 * Validate that the discovery search endpoint filters items by context and
 * status.
 *
 * Business goal: surfaces like a home feed must be able to fetch only their
 * active discovery inventory even when other items exist with different
 * statuses or contexts. This test wires up real backing content (community and
 * post), creates multiple discovery items with varied context/status
 * combinations, and then exercises PATCH /communityPlatform/discovery/items
 * with different filters to confirm that the returned summaries reflect the
 * intended inventory slices.
 *
 * High‑level flow:
 *
 * 1. Register a memberUser and keep that actor authenticated.
 * 2. As the memberUser, create a community and a membership, then create a post in
 *    that community to serve as the discovery target.
 * 3. Register an adminUser and switch to the admin actor.
 * 4. As the adminUser, create several discovery items:
 *
 *    - Two items with context="home_feed" and status="active" for the post.
 *    - One item with context="home_feed" and status="paused" for the same post.
 *    - Two items with context="onboarding" (one active, one paused) for the same
 *         post.
 * 5. Call PATCH /communityPlatform/discovery/items with context="home_feed" and
 *    status="active" and a generous page/limit.
 *
 *    - Assert pagination is sane.
 *    - Assert that at least the two active home_feed items are returned.
 *    - Assert that no ids corresponding to paused or onboarding items appear.
 * 6. Call the same endpoint with context="onboarding" and status="active".
 *
 *    - Assert that at least one onboarding active item is returned and that it
 *         targets the same post.
 */
export async function test_api_discovery_items_filter_by_status_and_context(
  connection: api.IConnection,
) {
  // 1. Register member user (will own community and posts)
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphaNumeric(8)}@member.test.com`,
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://client.example.com/signup",
    referrer: "https://client.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 2. Create a community as the member
  const communitySlugBase = RandomGenerator.alphaNumeric(12);
  const communityCreateBody = {
    slug: communitySlugBase,
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

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  // 3. Create a membership for the member in that community so posting is valid
  const membershipCreateBody = {
    role: "member",
    isApproved: true,
    isBanned: false,
  } satisfies ICommunityPlatformCommunityMembership.ICreate;

  const membership: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.memberUser.communities.memberships.create(
      connection,
      {
        communitySlug: community.slug,
        body: membershipCreateBody,
      },
    );
  typia.assert(membership);

  // 4. Create a post in the community
  const postCreateBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert(post);

  // 5. Register adminUser actor to manage discovery inventory
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphaNumeric(8)}@admin.test.com`,
    password: RandomGenerator.alphaNumeric(12),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 6. Create discovery items with varying status/context for the same post
  // 6-1. Active home_feed items
  const activeHomeFeedItem1Body = {
    target_type: "post",
    target_id: post.id,
    context: "home_feed",
    priority_score: 10,
    start_at: new Date().toISOString(),
    end_at: undefined,
    status: "active",
  } satisfies ICommunityPlatformDiscoveryItem.ICreate;

  const activeHomeFeedItem1: ICommunityPlatformDiscoveryItem =
    await api.functional.communityPlatform.adminUser.discovery.items.create(
      connection,
      {
        body: activeHomeFeedItem1Body,
      },
    );
  typia.assert(activeHomeFeedItem1);

  const activeHomeFeedItem2Body = {
    target_type: "post",
    target_id: post.id,
    context: "home_feed",
    priority_score: 20,
    start_at: new Date().toISOString(),
    end_at: undefined,
    status: "active",
  } satisfies ICommunityPlatformDiscoveryItem.ICreate;

  const activeHomeFeedItem2: ICommunityPlatformDiscoveryItem =
    await api.functional.communityPlatform.adminUser.discovery.items.create(
      connection,
      {
        body: activeHomeFeedItem2Body,
      },
    );
  typia.assert(activeHomeFeedItem2);

  // 6-2. Paused home_feed item that should be ignored by active filter
  const pausedHomeFeedItemBody = {
    target_type: "post",
    target_id: post.id,
    context: "home_feed",
    priority_score: 5,
    start_at: new Date().toISOString(),
    end_at: undefined,
    status: "paused",
  } satisfies ICommunityPlatformDiscoveryItem.ICreate;

  const pausedHomeFeedItem: ICommunityPlatformDiscoveryItem =
    await api.functional.communityPlatform.adminUser.discovery.items.create(
      connection,
      {
        body: pausedHomeFeedItemBody,
      },
    );
  typia.assert(pausedHomeFeedItem);

  // 6-3. Onboarding items (different context)
  const onboardingActiveItemBody = {
    target_type: "post",
    target_id: post.id,
    context: "onboarding",
    priority_score: 30,
    start_at: new Date().toISOString(),
    end_at: undefined,
    status: "active",
  } satisfies ICommunityPlatformDiscoveryItem.ICreate;

  const onboardingActiveItem: ICommunityPlatformDiscoveryItem =
    await api.functional.communityPlatform.adminUser.discovery.items.create(
      connection,
      {
        body: onboardingActiveItemBody,
      },
    );
  typia.assert(onboardingActiveItem);

  const onboardingPausedItemBody = {
    target_type: "post",
    target_id: post.id,
    context: "onboarding",
    priority_score: 15,
    start_at: new Date().toISOString(),
    end_at: undefined,
    status: "paused",
  } satisfies ICommunityPlatformDiscoveryItem.ICreate;

  const onboardingPausedItem: ICommunityPlatformDiscoveryItem =
    await api.functional.communityPlatform.adminUser.discovery.items.create(
      connection,
      {
        body: onboardingPausedItemBody,
      },
    );
  typia.assert(onboardingPausedItem);

  // 7. Query discovery items filtered by context="home_feed" and status="active"
  const homeFeedActiveRequestBody = {
    page: 1,
    limit: 10,
    status: "active",
    context: "home_feed",
    orderBy: "priority_score",
    orderDirection: "desc",
  } satisfies ICommunityPlatformDiscoveryItem.IRequest;

  const homeFeedActivePage: IPageICommunityPlatformDiscoveryItem.ISummary =
    await api.functional.communityPlatform.discovery.items.index(connection, {
      body: homeFeedActiveRequestBody,
    });
  typia.assert(homeFeedActivePage);

  // Basic pagination sanity
  TestValidator.predicate(
    "home_feed active pagination has non-negative counts",
    homeFeedActivePage.pagination.current >= 0 &&
      homeFeedActivePage.pagination.limit >= 0 &&
      homeFeedActivePage.pagination.records >= 0 &&
      homeFeedActivePage.pagination.pages >= 0,
  );

  // Expect at least the two active home_feed items in the result set (in a clean DB)
  TestValidator.predicate(
    "home_feed active query returns at least two items",
    homeFeedActivePage.data.length >= 2,
  );

  // All returned items should be summaries for our target post (in this fixture)
  for (const summary of homeFeedActivePage.data) {
    TestValidator.predicate(
      "home_feed active result has a non-empty resourceKind",
      typeof summary.resourceKind === "string" &&
        summary.resourceKind.length > 0,
    );

    TestValidator.equals(
      "home_feed active item resourceId should match post id",
      summary.resourceId,
      post.id,
    );
  }

  // Ensure that paused or onboarding discovery item identifiers are not surfaced
  const homeFeedIds = homeFeedActivePage.data.map((d) => d.id);

  TestValidator.predicate(
    "home_feed active results should not include paused home_feed item id",
    !homeFeedIds.includes(pausedHomeFeedItem.id),
  );

  TestValidator.predicate(
    "home_feed active results should not include onboarding active item id",
    !homeFeedIds.includes(onboardingActiveItem.id),
  );

  TestValidator.predicate(
    "home_feed active results should not include onboarding paused item id",
    !homeFeedIds.includes(onboardingPausedItem.id),
  );

  // 8. Query onboarding active inventory and validate that it is independently filterable
  const onboardingActiveRequestBody = {
    page: 1,
    limit: 10,
    status: "active",
    context: "onboarding",
    orderBy: "priority_score",
    orderDirection: "desc",
  } satisfies ICommunityPlatformDiscoveryItem.IRequest;

  const onboardingActivePage: IPageICommunityPlatformDiscoveryItem.ISummary =
    await api.functional.communityPlatform.discovery.items.index(connection, {
      body: onboardingActiveRequestBody,
    });
  typia.assert(onboardingActivePage);

  TestValidator.predicate(
    "onboarding active query returns at least one item",
    onboardingActivePage.data.length >= 1,
  );

  for (const summary of onboardingActivePage.data) {
    TestValidator.equals(
      "onboarding active item resourceId should match post id",
      summary.resourceId,
      post.id,
    );
  }

  // The set of discovery summary ids for onboarding should differ from the
  // home_feed slice to reflect independent inventory per context.
  const onboardingIds = onboardingActivePage.data.map((d) => d.id);
  TestValidator.predicate(
    "home_feed and onboarding contexts expose different discovery item ids",
    ArrayUtil.has(onboardingIds, (id) => !homeFeedIds.includes(id)),
  );
}
