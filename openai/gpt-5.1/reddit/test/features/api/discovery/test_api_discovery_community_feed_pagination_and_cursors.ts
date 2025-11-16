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

export async function test_api_discovery_community_feed_pagination_and_cursors(
  connection: api.IConnection,
) {
  // 1. Register a new member user and establish authenticated session
  const joinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphabets(12),
    ip: null,
    href: "https://client.example.com/signup",
    referrer: "https://client.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberUser: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(memberUser);

  // 2. Create a community for the member user
  const communityCreateBody = {
    slug: `${RandomGenerator.alphabets(10)}-community`,
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
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  // Helper to build a request body for discovery feed
  const buildRequest = (
    page: number,
    limit: number,
    cursor?: string,
  ): ICommunityPlatformDiscoveryCommunityFeed.IRequest => {
    return {
      page,
      limit,
      cursor,
      sortMode: "new",
      topTimeRange: "all",
      contentTypes: ["post"],
      nsfwFilter: "include",
      safetyLevel: "standard",
      excludeSeenItems: false,
    } satisfies ICommunityPlatformDiscoveryCommunityFeed.IRequest;
  };

  // 3. First page request: page=1, limit=5, sortMode="new", no cursor
  const firstRequest = buildRequest(1, 5);
  const firstPage: IPageICommunityPlatformDiscoveryCommunityFeed.ISummary =
    await api.functional.communityPlatform.memberUser.discovery.feeds.community.index(
      connection,
      {
        communityId: community.id,
        body: firstRequest,
      },
    );
  typia.assert(firstPage);

  TestValidator.equals(
    "first page current should be 1",
    firstPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "first page limit should be 5",
    firstPage.pagination.limit,
    5,
  );

  // 4. Second page request: page=2, same limit and sortMode
  const secondRequest = buildRequest(2, 5);
  const secondPage: IPageICommunityPlatformDiscoveryCommunityFeed.ISummary =
    await api.functional.communityPlatform.memberUser.discovery.feeds.community.index(
      connection,
      {
        communityId: community.id,
        body: secondRequest,
      },
    );
  typia.assert(secondPage);

  TestValidator.equals(
    "second page current should be 2",
    secondPage.pagination.current,
    2,
  );
  TestValidator.equals(
    "second page limit should remain 5",
    secondPage.pagination.limit,
    5,
  );

  // Optional: when both pages have at least one item, assert that they are not trivially empty
  if (firstPage.data.length > 0 && secondPage.data.length > 0) {
    const firstSections: ICommunityPlatformDiscoveryFeedSection.ISummary[] =
      firstPage.data[0]?.sections ?? [];
    const secondSections: ICommunityPlatformDiscoveryFeedSection.ISummary[] =
      secondPage.data[0]?.sections ?? [];

    if (firstSections.length > 0 && secondSections.length > 0) {
      const firstItems: ICommunityPlatformDiscoveryItem.ISummary[] =
        firstSections[0]?.items ?? [];
      const secondItems: ICommunityPlatformDiscoveryItem.ISummary[] =
        secondSections[0]?.items ?? [];

      TestValidator.predicate(
        "when sections exist, first and second page items should not both be empty",
        !(firstItems.length === 0 && secondItems.length === 0),
      );
    }
  }

  // 5. Cursor-based follow-up request: reuse page=1, limit=5 with a dummy cursor
  const cursorRequest = buildRequest(1, 5, RandomGenerator.alphaNumeric(16));
  const cursorPage: IPageICommunityPlatformDiscoveryCommunityFeed.ISummary =
    await api.functional.communityPlatform.memberUser.discovery.feeds.community.index(
      connection,
      {
        communityId: community.id,
        body: cursorRequest,
      },
    );
  typia.assert(cursorPage);

  TestValidator.equals(
    "cursor-based page current should remain 1",
    cursorPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "cursor-based page limit should remain 5",
    cursorPage.pagination.limit,
    5,
  );

  // 6. High-limit request: limit=100, maximum allowed by IRequest
  const highLimitRequest = buildRequest(1, 100);
  const highLimitPage: IPageICommunityPlatformDiscoveryCommunityFeed.ISummary =
    await api.functional.communityPlatform.memberUser.discovery.feeds.community.index(
      connection,
      {
        communityId: community.id,
        body: highLimitRequest,
      },
    );
  typia.assert(highLimitPage);

  TestValidator.equals(
    "high-limit page current should be 1",
    highLimitPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "high-limit page limit should be 100",
    highLimitPage.pagination.limit,
    100,
  );
}
