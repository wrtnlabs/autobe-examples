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

export async function test_api_discovery_community_feed_content_type_filters(
  connection: api.IConnection,
) {
  // 1. Register a memberUser (join) to obtain an authenticated context
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://example.com/join",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const member: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(member);
  typia.assert<IAuthorizationToken>(member.token);

  // 2. Create a community that will be used for discovery feeds
  const communityBody = {
    slug: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
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
        body: communityBody,
      },
    );
  typia.assert(community);

  // Helper to call the community-scoped discovery feed
  const fetchCommunityFeed = async (
    overrides?: Partial<ICommunityPlatformDiscoveryCommunityFeed.IRequest>,
  ): Promise<IPageICommunityPlatformDiscoveryCommunityFeed.ISummary> => {
    const baseRequest: ICommunityPlatformDiscoveryCommunityFeed.IRequest = {
      page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
      limit: 10 as number &
        tags.Type<"int32"> &
        tags.Minimum<1> &
        tags.Maximum<100>,
      sortMode: "hot",
    };

    const body: ICommunityPlatformDiscoveryCommunityFeed.IRequest = {
      ...baseRequest,
      ...overrides,
    };

    const response =
      await api.functional.communityPlatform.memberUser.discovery.feeds.community.index(
        connection,
        {
          communityId: community.id,
          body,
        },
      );
    typia.assert<IPageICommunityPlatformDiscoveryCommunityFeed.ISummary>(
      response,
    );
    return response;
  };

  // 3. Baseline feed without contentTypes filter
  const baselinePage = await fetchCommunityFeed();

  TestValidator.equals(
    "baseline pagination current page should be 1",
    baselinePage.pagination.current,
    1,
  );
  TestValidator.equals(
    "baseline pagination limit should be 10",
    baselinePage.pagination.limit,
    10,
  );

  // Optionally inspect that sections and items are structurally valid when present
  if (baselinePage.data.length > 0) {
    const firstFeed: ICommunityPlatformDiscoveryCommunityFeed.ISummary =
      baselinePage.data[0];
    typia.assert<ICommunityPlatformDiscoveryCommunityFeed.ISummary>(firstFeed);

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

  // 4a. Feed filtered to posts only
  const postsOnlyPage = await fetchCommunityFeed({
    contentTypes: ["post"],
  });
  TestValidator.equals(
    "posts-only pagination current page should be 1",
    postsOnlyPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "posts-only pagination limit should be 10",
    postsOnlyPage.pagination.limit,
    10,
  );

  // 4b. Feed filtered to comments only
  const commentsOnlyPage = await fetchCommunityFeed({
    contentTypes: ["comment"],
  });
  TestValidator.equals(
    "comments-only pagination current page should be 1",
    commentsOnlyPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "comments-only pagination limit should be 10",
    commentsOnlyPage.pagination.limit,
    10,
  );

  // 4c. Feed filtered to discovery items only
  const discoveryItemsOnlyPage = await fetchCommunityFeed({
    contentTypes: ["discoveryItem"],
  });
  TestValidator.equals(
    "discovery-items-only pagination current page should be 1",
    discoveryItemsOnlyPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "discovery-items-only pagination limit should be 10",
    discoveryItemsOnlyPage.pagination.limit,
    10,
  );

  // 4d. Feed with all supported content types combined
  const allTypesPage = await fetchCommunityFeed({
    contentTypes: ["post", "comment", "discoveryItem"],
  });
  TestValidator.equals(
    "all-types pagination current page should be 1",
    allTypesPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "all-types pagination limit should be 10",
    allTypesPage.pagination.limit,
    10,
  );

  // 5. Compare basic pagination consistency across variants
  const pages: IPageICommunityPlatformDiscoveryCommunityFeed.ISummary[] = [
    baselinePage,
    postsOnlyPage,
    commentsOnlyPage,
    discoveryItemsOnlyPage,
    allTypesPage,
  ];

  for (const page of pages) {
    TestValidator.equals(
      "every variant should report current page = 1",
      page.pagination.current,
      baselinePage.pagination.current,
    );
    TestValidator.equals(
      "every variant should report limit = 10",
      page.pagination.limit,
      baselinePage.pagination.limit,
    );
  }
}
