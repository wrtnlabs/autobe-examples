import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformDiscoveryFeedSection } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformDiscoveryFeedSection";
import type { ICommunityPlatformDiscoveryHomeFeed } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformDiscoveryHomeFeed";
import type { ICommunityPlatformDiscoveryItem } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformDiscoveryItem";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformDiscoveryHomeFeed } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformDiscoveryHomeFeed";

/**
 * Validate home discovery feed sort modes and time ranges handling.
 *
 * This E2E test verifies that the memberUser home discovery feed endpoint
 * (PATCH /communityPlatform/memberUser/discovery/feeds/home) correctly accepts
 * different sortMode values and, where relevant, topTimeRange filters. It
 * focuses on request/response type correctness and parameter acceptance, not on
 * specific ranking algorithms.
 *
 * Business workflow:
 *
 * 1. Register and authenticate a new memberUser using auth.memberUser.join.
 * 2. Create a new community using communityPlatform.memberUser.communities.create.
 * 3. Subscribe the memberUser to that community using
 *    communityPlatform.memberUser.subscriptions.create.
 * 4. Call the home discovery feed endpoint multiple times, covering:
 *
 *    - SortMode="hot" with no topTimeRange.
 *    - SortMode="new" with no topTimeRange.
 *    - SortMode="top" with topTimeRange="hour","day","week", "month","year","all".
 *    - SortMode="controversial" with a valid topTimeRange (e.g. "day").
 * 5. For each call, ensure that:
 *
 *    - The call succeeds without throwing.
 *    - The response conforms to IPageICommunityPlatformDiscoveryHomeFeed.ISummary
 *         (validated by typia.assert).
 *    - Basic pagination fields are coherent with the requested page/limit.
 *    - Each discovery feed summary has structurally valid sections and items.
 * 6. Optionally, when non-empty data is returned for different sort modes, check
 *    that not all responses are identical across modes to confirm that the
 *    backend is at least varying results, without asserting strict sort
 *    semantics.
 */
export async function test_api_discovery_home_feed_sort_modes_and_time_ranges(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new memberUser.
  const joinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(10),
    ip: null,
    href: "https://example.com/signup",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const authorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);
  typia.assert<IAuthorizationToken>(authorized.token);

  // 2. Create a new community as this memberUser.
  const createCommunityBody = {
    slug: RandomGenerator.alphaNumeric(12),
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
      { body: createCommunityBody },
    );
  typia.assert(community);

  // 3. Subscribe the memberUser to the created community.
  const subscriptionBody = {
    community_platform_community_id: community.id,
    is_active: true,
    receive_notifications: true,
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;

  const subscription: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.subscriptions.create(
      connection,
      { body: subscriptionBody },
    );
  typia.assert(subscription);

  // 4. Prepare sortMode/topTimeRange combinations for the home feed.
  type SortMode = ICommunityPlatformDiscoveryHomeFeed.IRequest["sortMode"];
  type TopTimeRange = NonNullable<
    ICommunityPlatformDiscoveryHomeFeed.IRequest["topTimeRange"]
  >;

  const basePage = 1 as number & tags.Type<"int32"> & tags.Minimum<1>;
  const baseLimit = 10 as number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100>;

  const requests: {
    sortMode: SortMode;
    topTimeRange?: TopTimeRange;
  }[] = [
    { sortMode: "hot" },
    { sortMode: "new" },
    { sortMode: "top", topTimeRange: "hour" },
    { sortMode: "top", topTimeRange: "day" },
    { sortMode: "top", topTimeRange: "week" },
    { sortMode: "top", topTimeRange: "month" },
    { sortMode: "top", topTimeRange: "year" },
    { sortMode: "top", topTimeRange: "all" },
    { sortMode: "controversial", topTimeRange: "day" },
  ];

  const responses: IPageICommunityPlatformDiscoveryHomeFeed.ISummary[] = [];

  for (const req of requests) {
    const body: ICommunityPlatformDiscoveryHomeFeed.IRequest = {
      page: basePage,
      limit: baseLimit,
      cursor: undefined,
      sortMode: req.sortMode,
      topTimeRange: req.topTimeRange,
      includeCommunityIds: [community.id],
      excludeCommunityIds: undefined,
      contentTypes: undefined,
      nsfwFilter: "exclude",
      safetyLevel: "standard",
      excludeSeenItems: false,
    } satisfies ICommunityPlatformDiscoveryHomeFeed.IRequest;

    const pageResult: IPageICommunityPlatformDiscoveryHomeFeed.ISummary =
      await api.functional.communityPlatform.memberUser.discovery.feeds.home.index(
        connection,
        { body },
      );
    typia.assert(pageResult);

    // Basic pagination sanity checks.
    TestValidator.equals(
      `pagination.current matches requested page for sort=${req.sortMode}`,
      pageResult.pagination.current,
      basePage,
    );
    TestValidator.equals(
      `pagination.limit matches requested limit for sort=${req.sortMode}`,
      pageResult.pagination.limit,
      baseLimit,
    );

    // Structural checks for sections and items.
    for (const feed of pageResult.data) {
      typia.assert<ICommunityPlatformDiscoveryHomeFeed.ISummary>(feed);
      for (const section of feed.sections) {
        typia.assert<ICommunityPlatformDiscoveryFeedSection.ISummary>(section);
        for (const item of section.items) {
          typia.assert<ICommunityPlatformDiscoveryItem.ISummary>(item);
        }
      }
    }

    responses.push(pageResult);
  }

  // 5. Optional check: if we have multiple non-empty responses, ensure
  // that responses between at least two different sort modes are not all
  // identical when they both contain data.
  const nonEmptyIndices: number[] = responses
    .map((r, index) => (r.data.length > 0 ? index : -1))
    .filter((idx) => idx >= 0);

  if (nonEmptyIndices.length >= 2) {
    const first = responses[nonEmptyIndices[0]];
    const second = responses[nonEmptyIndices[1]];

    const serializedFirst = JSON.stringify(first.data);
    const serializedSecond = JSON.stringify(second.data);

    TestValidator.predicate(
      "home discovery feed data for different sort modes should not always be identical when non-empty",
      serializedFirst === serializedSecond ? false : true,
    );
  }
}
