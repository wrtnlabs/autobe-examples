import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformDiscoveryCommunityFeed } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformDiscoveryCommunityFeed";
import type { ICommunityPlatformDiscoveryFeedSection } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformDiscoveryFeedSection";
import type { ICommunityPlatformDiscoveryItem } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformDiscoveryItem";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformDiscoveryCommunityFeed } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformDiscoveryCommunityFeed";

/**
 * Validate that the community-scoped discovery feed endpoint accepts all
 * supported sort modes and time ranges and returns structurally valid paginated
 * responses.
 *
 * Business flow:
 *
 * 1. Register a new memberUser and obtain an authenticated session via the join
 *    endpoint (token is wired into the connection by the SDK).
 * 2. Create a new community as that memberUser and capture its id.
 * 3. Invoke the community discovery feed endpoint multiple times for the created
 *    community with different combinations of sortMode and topTimeRange
 *    values.
 * 4. For each response, validate pagination metadata and overall response
 *    structure using typia.assert and lightweight logical checks.
 * 5. When possible (non-empty feeds), perform shallow comparisons between
 *    different sort configurations to confirm that sort parameters impact the
 *    resulting feed ordering.
 */
export async function test_api_discovery_community_feed_sort_modes_and_time_ranges(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new member user
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const authorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(authorized);
  typia.assert<IAuthorizationToken>(authorized.token);

  // 2. Create a community for this member user
  const communityCreateBody = {
    slug: RandomGenerator.alphabets(12),
    name: RandomGenerator.name(2),
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
      { body: communityCreateBody },
    );
  typia.assert<ICommunityPlatformCommunity>(community);

  // Base pagination configuration
  const page: number & tags.Type<"int32"> & tags.Minimum<1> =
    1 satisfies number as number;
  const limit: number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100> = 20 satisfies number as number;

  type SortConfig = {
    sortMode: ICommunityPlatformDiscoveryCommunityFeed.IRequest["sortMode"];
    topTimeRange?: "hour" | "day" | "week" | "month" | "year" | "all";
  };

  const sortConfigs: SortConfig[] = [
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

  const responses: IPageICommunityPlatformDiscoveryCommunityFeed.ISummary[] =
    [];

  // 3. Call the discovery feed for each sort configuration
  for (const config of sortConfigs) {
    const requestBody: ICommunityPlatformDiscoveryCommunityFeed.IRequest = {
      page,
      limit,
      cursor: undefined,
      sortMode: config.sortMode,
      topTimeRange: config.topTimeRange,
      contentTypes: ["post", "discoveryItem"],
      nsfwFilter: "exclude",
      safetyLevel: "standard",
      excludeSeenItems: false,
    };

    const pageResult: IPageICommunityPlatformDiscoveryCommunityFeed.ISummary =
      await api.functional.communityPlatform.memberUser.discovery.feeds.community.index(
        connection,
        {
          communityId: community.id,
          body: requestBody,
        },
      );

    // 4. Structural assertions
    typia.assert<IPageICommunityPlatformDiscoveryCommunityFeed.ISummary>(
      pageResult,
    );

    const pagination: IPage.IPagination = pageResult.pagination;
    typia.assert<IPage.IPagination>(pagination);

    TestValidator.equals(
      `pagination current should be 1 for sortMode=${config.sortMode}`,
      pagination.current,
      1,
    );
    TestValidator.equals(
      `pagination limit should match requested limit for sortMode=${config.sortMode}`,
      pagination.limit,
      limit,
    );
    TestValidator.predicate(
      `records should be non-negative for sortMode=${config.sortMode}`,
      pagination.records >= 0,
    );
    TestValidator.predicate(
      `pages should be non-negative for sortMode=${config.sortMode}`,
      pagination.pages >= 0,
    );

    // Validate that each feed summary and its sections/items are structurally correct
    for (const summary of pageResult.data) {
      typia.assert<ICommunityPlatformDiscoveryCommunityFeed.ISummary>(summary);
      for (const section of summary.sections) {
        typia.assert<ICommunityPlatformDiscoveryFeedSection.ISummary>(section);
        for (const item of section.items) {
          typia.assert<ICommunityPlatformDiscoveryItem.ISummary>(item);
        }
      }
    }

    responses.push(pageResult);
  }

  // 5. Optional: compare non-empty feeds between different sort modes
  type NonEmptyFeed = {
    config: SortConfig;
    response: IPageICommunityPlatformDiscoveryCommunityFeed.ISummary;
  };
  const nonEmptyFeeds: NonEmptyFeed[] = [];

  for (let i = 0; i < sortConfigs.length; i++) {
    const response = responses[i];
    if (response.data.length > 0) {
      nonEmptyFeeds.push({ config: sortConfigs[i], response });
    }
  }

  if (nonEmptyFeeds.length >= 2) {
    const first = nonEmptyFeeds[0];
    const second = nonEmptyFeeds[1];

    const firstSections = first.response.data[0]?.sections ?? [];
    const secondSections = second.response.data[0]?.sections ?? [];

    TestValidator.notEquals(
      `first sections for sortMode=${first.config.sortMode} should not be identical to sortMode=${second.config.sortMode}`,
      firstSections,
      secondSections,
    );
  }
}
