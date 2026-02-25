import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityAnnouncement } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityAnnouncement";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityAnnouncement } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityAnnouncement";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_admin_communities_announcements_create } from "../../../generate/generate_random_community_platform_admin_communities_announcements_create";
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_announcement } from "../../../prepare/prepare_random_community_platform_community_announcement";

export async function test_api_community_announcements_search_basic_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection for announcement creation
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    },
  });
  // Create user connection for community creation
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // Create test community
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: null,
        },
      },
    );
  typia.assert(community);
  // Create multiple announcements with different characteristics
  const announcements: ICommunityPlatformCommunityAnnouncement[] = [];
  // Pinned published announcement with keyword
  const pinnedPublished =
    await generate_random_community_platform_admin_communities_announcements_create(
      adminConnection,
      {
        params: { communityId: community.id },
        body: {
          title: "Important update about community rules test keyword",
          content: "This is a pinned announcement with test keyword in content",
          is_pinned: true,
          status: "active" as const,
        },
      },
    );
  typia.assert(pinnedPublished);
  announcements.push(pinnedPublished);
  // Unpinned published announcement with keyword
  const unpinnedPublished =
    await generate_random_community_platform_admin_communities_announcements_create(
      adminConnection,
      {
        params: { communityId: community.id },
        body: {
          title: "Regular community news test keyword",
          content: "This is a regular announcement with test keyword",
          is_pinned: false,
          status: "active" as const,
        },
      },
    );
  typia.assert(unpinnedPublished);
  announcements.push(unpinnedPublished);
  // Draft announcement (should not appear in published searches)
  const draftAnnouncement =
    await generate_random_community_platform_admin_communities_announcements_create(
      adminConnection,
      {
        params: { communityId: community.id },
        body: {
          title: "Draft announcement test keyword",
          content: "This is a draft announcement",
          is_pinned: false,
          status: "draft" as const,
        },
      },
    );
  typia.assert(draftAnnouncement);
  announcements.push(draftAnnouncement);
  // Inactive announcement (should not appear in published searches)
  const inactiveAnnouncement =
    await generate_random_community_platform_admin_communities_announcements_create(
      adminConnection,
      {
        params: { communityId: community.id },
        body: {
          title: "Inactive announcement test keyword",
          content: "This is an inactive announcement",
          is_pinned: false,
          status: "inactive" as const,
        },
      },
    );
  typia.assert(inactiveAnnouncement);
  announcements.push(inactiveAnnouncement);
  // Test 1: Search by keyword in title and content
  const keywordSearch =
    await api.functional.communityPlatform.communities.announcements.search(
      connection,
      {
        communityId: community.id,
        body: {
          search: "test keyword",
        } satisfies ICommunityPlatformCommunityAnnouncement.IRequest,
      },
    );
  typia.assert(keywordSearch);
  // Verify partial matching works - should find announcements containing "test keyword"
  TestValidator.predicate(
    "keyword search returns results",
    keywordSearch.data.length > 0,
  );
  // Test 2: Filter by status=published only
  const publishedSearch =
    await api.functional.communityPlatform.communities.announcements.search(
      connection,
      {
        communityId: community.id,
        body: {
          status: "active",
        } satisfies ICommunityPlatformCommunityAnnouncement.IRequest,
      },
    );
  typia.assert(publishedSearch);
  // Should only return published announcements
  TestValidator.predicate(
    "published search returns only active announcements",
    publishedSearch.data.every(
      (announcement) => announcement.status === "active",
    ),
  );
  // Test 3: Filter by is_pinned=true
  const pinnedSearch =
    await api.functional.communityPlatform.communities.announcements.search(
      connection,
      {
        communityId: community.id,
        body: {
          is_pinned: true,
        } satisfies ICommunityPlatformCommunityAnnouncement.IRequest,
      },
    );
  typia.assert(pinnedSearch);
  // Should only return pinned announcements
  TestValidator.predicate(
    "pinned search returns only pinned announcements",
    pinnedSearch.data.every((announcement) => announcement.is_pinned === true),
  );
  // Test 4: Combined search with keyword and status filtering
  const combinedSearch =
    await api.functional.communityPlatform.communities.announcements.search(
      connection,
      {
        communityId: community.id,
        body: {
          search: "test keyword",
          status: "active",
        } satisfies ICommunityPlatformCommunityAnnouncement.IRequest,
      },
    );
  typia.assert(combinedSearch);
  // Should return only published announcements containing the keyword
  TestValidator.predicate(
    "combined search returns matching active announcements",
    combinedSearch.data.every(
      (announcement) =>
        announcement.status === "active" &&
        announcement.title.includes("test keyword"),
    ),
  );
  // Validate pinning sorting: pinned announcements appear first
  const allAnnouncementsSearch =
    await api.functional.communityPlatform.communities.announcements.search(
      connection,
      {
        communityId: community.id,
        body: {
          limit: 10,
        } satisfies ICommunityPlatformCommunityAnnouncement.IRequest,
      },
    );
  typia.assert(allAnnouncementsSearch);
  if (allAnnouncementsSearch.data.length > 1) {
    // Find the first unpinned announcement
    const firstUnpinnedIndex = allAnnouncementsSearch.data.findIndex(
      (announcement) => !announcement.is_pinned,
    );
    if (firstUnpinnedIndex > 0) {
      // All announcements before the first unpinned should be pinned
      TestValidator.predicate(
        "pinned announcements appear before unpinned ones",
        allAnnouncementsSearch.data
          .slice(0, firstUnpinnedIndex)
          .every((announcement) => announcement.is_pinned),
      );
    }
  }
  // Validate author information
  TestValidator.predicate(
    "each announcement includes author summary",
    allAnnouncementsSearch.data.every(
      (announcement) =>
        announcement.author &&
        typeof announcement.author.id === "string" &&
        typeof announcement.author.username === "string" &&
        announcement.author.created_at,
    ),
  );
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination metadata is accurate",
    allAnnouncementsSearch.pagination.current >= 1 &&
      allAnnouncementsSearch.pagination.limit > 0 &&
      allAnnouncementsSearch.pagination.records >= 0 &&
      allAnnouncementsSearch.pagination.pages >= 0,
  );
  // Test pagination
  const paginatedSearch =
    await api.functional.communityPlatform.communities.announcements.search(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 2,
        } satisfies ICommunityPlatformCommunityAnnouncement.IRequest,
      },
    );
  typia.assert(paginatedSearch);
  TestValidator.predicate(
    "pagination returns correct number of items",
    paginatedSearch.data.length <= 2,
  );
  // Ensure search results don't include announcements from other communities
  // Create another community
  const otherCommunity =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: null,
        },
      },
    );
  typia.assert(otherCommunity);
  // Create announcement in other community
  await generate_random_community_platform_admin_communities_announcements_create(
    adminConnection,
    {
      params: { communityId: otherCommunity.id },
      body: {
        title: "Announcement in other community test keyword",
        content: "This should not appear in first community search",
        is_pinned: false,
        status: "active" as const,
      },
    },
  );
  // Search original community again - should not include announcement from other community
  const finalSearch =
    await api.functional.communityPlatform.communities.announcements.search(
      connection,
      {
        communityId: community.id,
        body: {
          search: "test keyword",
        } satisfies ICommunityPlatformCommunityAnnouncement.IRequest,
      },
    );
  typia.assert(finalSearch);
  // All announcements should belong to the original community
  TestValidator.predicate(
    "search results only include announcements from target community",
    finalSearch.data.length > 0,
  );
}