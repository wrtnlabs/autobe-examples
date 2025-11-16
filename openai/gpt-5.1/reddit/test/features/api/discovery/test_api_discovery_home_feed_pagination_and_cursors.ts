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

export async function test_api_discovery_home_feed_pagination_and_cursors(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a member user so that memberUser-only APIs work
  const joinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphabets(10),
    ip: null,
    href: "https://example.com/join",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const authorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(authorized);

  // 2. Create multiple communities to have something to subscribe to
  const communities: ICommunityPlatformCommunity[] =
    await ArrayUtil.asyncRepeat(6, async (index) => {
      const body = {
        slug: `${RandomGenerator.alphabets(8)}-${index}`,
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

      const created =
        await api.functional.communityPlatform.memberUser.communities.create(
          connection,
          { body },
        );
      typia.assert<ICommunityPlatformCommunity>(created);
      return created;
    });

  TestValidator.predicate(
    "at least one community created",
    communities.length > 0,
  );

  // 3. Subscribe the member user to each created community
  const subscriptions: ICommunityPlatformCommunitySubscription[] =
    await ArrayUtil.asyncMap(communities, async (community) => {
      const body = {
        community_platform_community_id: community.id,
        is_active: true,
        receive_notifications: true,
      } satisfies ICommunityPlatformCommunitySubscription.ICreate;

      const subscription =
        await api.functional.communityPlatform.memberUser.subscriptions.create(
          connection,
          { body },
        );
      typia.assert<ICommunityPlatformCommunitySubscription>(subscription);
      return subscription;
    });

  TestValidator.equals(
    "subscription count matches community count",
    subscriptions.length,
    communities.length,
  );

  // Helper to call home feed index with the given page/limit
  const fetchHomeFeed = async (
    page: number,
    limit: number,
  ): Promise<IPageICommunityPlatformDiscoveryHomeFeed.ISummary> => {
    const body = {
      page,
      limit,
      sortMode: "new",
      cursor: undefined,
      topTimeRange: undefined,
      includeCommunityIds: undefined,
      excludeCommunityIds: undefined,
      contentTypes: undefined,
      nsfwFilter: undefined,
      safetyLevel: undefined,
      excludeSeenItems: undefined,
    } satisfies ICommunityPlatformDiscoveryHomeFeed.IRequest;

    const pageResult =
      await api.functional.communityPlatform.memberUser.discovery.feeds.home.index(
        connection,
        { body },
      );
    typia.assert<IPageICommunityPlatformDiscoveryHomeFeed.ISummary>(pageResult);

    // Basic structural sanity checks on pagination and data
    TestValidator.equals(
      `pagination.limit matches requested limit (page ${page})`,
      pageResult.pagination.limit,
      limit,
    );
    TestValidator.equals(
      `pagination.current matches requested page (${page})`,
      pageResult.pagination.current,
      page,
    );

    return pageResult;
  };

  // 4. First page: page=1, limit=5, sortMode="new"
  const firstPage = await fetchHomeFeed(1, 5);

  // Sanity check that sections array exists and items are correctly shaped
  if (firstPage.data.length > 0) {
    const firstFeed: ICommunityPlatformDiscoveryHomeFeed.ISummary =
      firstPage.data[0];
    typia.assert<ICommunityPlatformDiscoveryHomeFeed.ISummary>(firstFeed);

    if (firstFeed.sections.length > 0) {
      const firstSection: ICommunityPlatformDiscoveryFeedSection.ISummary =
        firstFeed.sections[0];
      typia.assert<ICommunityPlatformDiscoveryFeedSection.ISummary>(
        firstSection,
      );

      if (firstSection.items.length > 0) {
        const firstItem: ICommunityPlatformDiscoveryItem.ISummary =
          firstSection.items[0];
        typia.assert<ICommunityPlatformDiscoveryItem.ISummary>(firstItem);
      }
    }
  }

  // 5. Second page: page=2, same limit and sort mode
  const secondPage = await fetchHomeFeed(2, 5);

  // If both pages contain data, they should not be completely identical arrays
  if (firstPage.data.length > 0 && secondPage.data.length > 0) {
    TestValidator.notEquals(
      "home feed pages 1 and 2 data should not be entirely identical",
      firstPage.data,
      secondPage.data,
    );
  }

  // 6. Extreme but valid pagination: high page number and limit=100 (max)
  const extremePageNumber = 3;
  const extremeLimit = 100;
  const extremePage = await fetchHomeFeed(extremePageNumber, extremeLimit);

  TestValidator.equals(
    "extreme page uses requested limit",
    extremePage.pagination.limit,
    extremeLimit,
  );
  TestValidator.equals(
    "extreme page.current matches requested page",
    extremePage.pagination.current,
    extremePageNumber,
  );
}
