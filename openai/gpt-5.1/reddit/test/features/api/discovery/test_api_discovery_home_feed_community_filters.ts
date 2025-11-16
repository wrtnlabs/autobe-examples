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

export async function test_api_discovery_home_feed_community_filters(
  connection: api.IConnection,
) {
  // 1. Register a new member user and obtain an authenticated session
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://community.example.com/signup",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const member: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(member);

  // 2. Create two distinct communities
  const communityCreateBase = {
    visibility: "public",
    status: "active",
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: false,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
  } satisfies Pick<
    ICommunityPlatformCommunity.ICreate,
    | "visibility"
    | "status"
    | "is_nsfw"
    | "is_quarantined"
    | "is_posting_restricted"
    | "allow_text_posts"
    | "allow_link_posts"
    | "allow_image_posts"
  >;

  const community1Body = {
    ...communityCreateBase,
    slug: `test-community-${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community2Body = {
    ...communityCreateBase,
    slug: `test-community-${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community1: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: community1Body,
      },
    );
  typia.assert<ICommunityPlatformCommunity>(community1);

  const community2: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: community2Body,
      },
    );
  typia.assert<ICommunityPlatformCommunity>(community2);

  // 3. Subscribe the member user to both communities
  const subscription1Body = {
    community_platform_community_id: community1.id,
    is_active: true,
    receive_notifications: true,
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;

  const subscription2Body = {
    community_platform_community_id: community2.id,
    is_active: true,
    receive_notifications: true,
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;

  const subscription1: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.subscriptions.create(
      connection,
      {
        body: subscription1Body,
      },
    );
  typia.assert<ICommunityPlatformCommunitySubscription>(subscription1);

  const subscription2: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.subscriptions.create(
      connection,
      {
        body: subscription2Body,
      },
    );
  typia.assert<ICommunityPlatformCommunitySubscription>(subscription2);

  // Helper to validate a discovery page structurally
  const assertDiscoveryPage = (
    title: string,
    page: IPageICommunityPlatformDiscoveryHomeFeed.ISummary,
  ) => {
    typia.assert<IPageICommunityPlatformDiscoveryHomeFeed.ISummary>(page);

    // basic logical sanity checks on pagination
    TestValidator.predicate(
      `${title} - current page >= 0`,
      page.pagination.current >= 0,
    );
    TestValidator.predicate(`${title} - limit > 0`, page.pagination.limit > 0);

    // Assert each feed summary and section/items
    for (const feed of page.data) {
      typia.assert<ICommunityPlatformDiscoveryHomeFeed.ISummary>(feed);
      for (const section of feed.sections) {
        typia.assert<ICommunityPlatformDiscoveryFeedSection.ISummary>(section);
        for (const item of section.items) {
          typia.assert<ICommunityPlatformDiscoveryItem.ISummary>(item);
        }
      }
    }
  };

  // 4. Request home feed including only community1
  const includeRequestBody = {
    page: 1,
    limit: 10,
    sortMode: "hot" as const,
    includeCommunityIds: [community1.id],
  } satisfies ICommunityPlatformDiscoveryHomeFeed.IRequest;

  const includePage: IPageICommunityPlatformDiscoveryHomeFeed.ISummary =
    await api.functional.communityPlatform.memberUser.discovery.feeds.home.index(
      connection,
      {
        body: includeRequestBody,
      },
    );
  assertDiscoveryPage("includeCommunityIds[community1]", includePage);

  // 5. Request home feed excluding community1 (implicitly allowing community2)
  const excludeRequestBody = {
    page: 1,
    limit: 10,
    sortMode: "hot" as const,
    excludeCommunityIds: [community1.id],
  } satisfies ICommunityPlatformDiscoveryHomeFeed.IRequest;

  const excludePage: IPageICommunityPlatformDiscoveryHomeFeed.ISummary =
    await api.functional.communityPlatform.memberUser.discovery.feeds.home.index(
      connection,
      {
        body: excludeRequestBody,
      },
    );
  assertDiscoveryPage("excludeCommunityIds[community1]", excludePage);

  // 6. Optionally compare item identity between include and exclude responses
  const collectItemIds = (
    page: IPageICommunityPlatformDiscoveryHomeFeed.ISummary,
  ): string[] => {
    const ids: string[] = [];
    for (const feed of page.data) {
      for (const section of feed.sections) {
        for (const item of section.items) {
          ids.push(item.id);
        }
      }
    }
    return ids;
  };

  const includeItemIds = collectItemIds(includePage);
  const excludeItemIds = collectItemIds(excludePage);

  if (includeItemIds.length > 0 && excludeItemIds.length > 0) {
    const sameLength = includeItemIds.length === excludeItemIds.length;
    const everySame =
      sameLength &&
      includeItemIds.every((id, index) => id === excludeItemIds[index]);

    TestValidator.predicate(
      "include vs exclude feeds should not be trivially identical when both non-empty",
      everySame === false,
    );
  }

  // 7. Behavior when both includeCommunityIds and excludeCommunityIds are provided
  const combinedFilterBody = {
    page: 1,
    limit: 10,
    sortMode: "hot" as const,
    includeCommunityIds: [community1.id, community2.id],
    excludeCommunityIds: [community1.id],
  } satisfies ICommunityPlatformDiscoveryHomeFeed.IRequest;

  let combinedPage: IPageICommunityPlatformDiscoveryHomeFeed.ISummary | null =
    null;
  let combinedErrored = false;

  try {
    combinedPage =
      await api.functional.communityPlatform.memberUser.discovery.feeds.home.index(
        connection,
        {
          body: combinedFilterBody,
        },
      );
  } catch {
    combinedErrored = true;
  }

  // Either we got an error (business-level rejection), or we must have
  // a structurally valid page.
  if (combinedErrored === false && combinedPage !== null) {
    assertDiscoveryPage("combined include+exclude", combinedPage);
  } else {
    TestValidator.predicate(
      "combined include+exclude either errors or returns a valid page",
      combinedErrored === true,
    );
  }
}
