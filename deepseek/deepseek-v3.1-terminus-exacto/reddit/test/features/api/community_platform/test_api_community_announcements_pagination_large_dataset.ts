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

export async function test_api_community_announcements_pagination_large_dataset(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate user
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  // 2. Create community
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Create and authenticate admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // 4. Create 50+ announcements with various statuses and pinned flags
  const announcementCount = 55;
  const announcements: ICommunityPlatformCommunityAnnouncement[] = [];
  const statuses = ["active", "inactive", "draft"] as const;
  for (let i = 0; i < announcementCount; i++) {
    const announcement =
      await generate_random_community_platform_admin_communities_announcements_create(
        adminConnection,
        {
          params: { communityId: community.id },
          body: {
            title: RandomGenerator.paragraph({ sentences: 1 }),
            content: RandomGenerator.paragraph({ sentences: 3 }),
            is_pinned: i % 5 === 0, // Every 5th announcement is pinned
            status: statuses[i % statuses.length],
          } satisfies ICommunityPlatformCommunityAnnouncement.ICreate,
        },
      );
    typia.assert(announcement);
    announcements.push(announcement);
  }
  // 5. Test default pagination (no page/limit specified)
  const defaultSearch =
    await api.functional.communityPlatform.communities.announcements.search(
      userConnection,
      {
        communityId: community.id,
        body: {} satisfies ICommunityPlatformCommunityAnnouncement.IRequest,
      },
    );
  typia.assert(defaultSearch);
  TestValidator.predicate(
    "default pagination should return data",
    defaultSearch.data.length > 0,
  );
  TestValidator.predicate(
    "default pagination should have valid limit",
    defaultSearch.pagination.limit > 0,
  );
  TestValidator.predicate(
    "default pagination should have valid current page",
    defaultSearch.pagination.current === 1,
  );
  // 6. Test custom pagination with limit=10, page=2
  const customSearch =
    await api.functional.communityPlatform.communities.announcements.search(
      userConnection,
      {
        communityId: community.id,
        body: {
          limit: 10,
          page: 2,
        } satisfies ICommunityPlatformCommunityAnnouncement.IRequest,
      },
    );
  typia.assert(customSearch);
  TestValidator.equals(
    "custom pagination limit",
    customSearch.pagination.limit,
    10,
  );
  TestValidator.equals(
    "custom pagination current page",
    customSearch.pagination.current,
    2,
  );
  TestValidator.predicate(
    "custom pagination data count should not exceed limit",
    customSearch.data.length <= 10,
  );
  // 7. Test edge cases
  // First page
  const firstPage =
    await api.functional.communityPlatform.communities.announcements.search(
      userConnection,
      {
        communityId: community.id,
        body: {
          limit: 10,
          page: 1,
        } satisfies ICommunityPlatformCommunityAnnouncement.IRequest,
      },
    );
  typia.assert(firstPage);
  TestValidator.equals(
    "first page should be page 1",
    firstPage.pagination.current,
    1,
  );
  // Last page calculation
  const totalActiveAnnouncements = announcements.filter(
    (a) => a.status === "active",
  ).length;
  const totalPages = Math.ceil(totalActiveAnnouncements / 10);
  const lastPage =
    await api.functional.communityPlatform.communities.announcements.search(
      userConnection,
      {
        communityId: community.id,
        body: {
          limit: 10,
          page: totalPages,
        } satisfies ICommunityPlatformCommunityAnnouncement.IRequest,
      },
    );
  typia.assert(lastPage);
  TestValidator.equals(
    "last page calculation",
    lastPage.pagination.current,
    totalPages,
  );
  // Page beyond available records
  const beyondPage =
    await api.functional.communityPlatform.communities.announcements.search(
      userConnection,
      {
        communityId: community.id,
        body: {
          limit: 10,
          page: totalPages + 1,
        } satisfies ICommunityPlatformCommunityAnnouncement.IRequest,
      },
    );
  typia.assert(beyondPage);
  TestValidator.equals(
    "page beyond records should return empty data",
    beyondPage.data.length,
    0,
  );
  TestValidator.predicate(
    "page beyond records should have correct pagination metadata",
    beyondPage.pagination.current === totalPages + 1 &&
      beyondPage.pagination.records === totalActiveAnnouncements,
  );
  // 8. Validate pagination metadata matches actual filtered count
  const activeAnnouncements = announcements.filter(
    (a) => a.status === "active",
  );
  const activeSearch =
    await api.functional.communityPlatform.communities.announcements.search(
      userConnection,
      {
        communityId: community.id,
        body: {
          status: "active",
        } satisfies ICommunityPlatformCommunityAnnouncement.IRequest,
      },
    );
  typia.assert(activeSearch);
  TestValidator.equals(
    "pagination records should match filtered count",
    activeSearch.pagination.records,
    activeAnnouncements.length,
  );
  // 9. Test sorting: pinned first, then newest created date
  const sortedSearch =
    await api.functional.communityPlatform.communities.announcements.search(
      userConnection,
      {
        communityId: community.id,
        body: {} satisfies ICommunityPlatformCommunityAnnouncement.IRequest,
      },
    );
  typia.assert(sortedSearch);
  // Check that pinned announcements come first
  let foundUnpinned = false;
  for (const announcement of sortedSearch.data) {
    if (!announcement.is_pinned) {
      foundUnpinned = true;
    } else {
      TestValidator.predicate(
        "pinned announcements should come before unpinned",
        !foundUnpinned,
      );
    }
  }
  // 10. Test consistency across pages (no duplicates, no missing announcements)
  const allAnnouncements: ICommunityPlatformCommunityAnnouncement.ISummary[] =
    [];
  const pageSize = 10;
  for (let page = 1; page <= totalPages; page++) {
    const pageResults =
      await api.functional.communityPlatform.communities.announcements.search(
        userConnection,
        {
          communityId: community.id,
          body: {
            limit: pageSize,
            page: page,
          } satisfies ICommunityPlatformCommunityAnnouncement.IRequest,
        },
      );
    typia.assert(pageResults);
    allAnnouncements.push(...pageResults.data);
  }
  // Check for duplicates
  const announcementIds = allAnnouncements.map((a) => a.id);
  const uniqueIds = new Set(announcementIds);
  TestValidator.equals(
    "no duplicate announcements across pages",
    announcementIds.length,
    uniqueIds.size,
  );
  // Check that we got all active announcements
  const activeIdsFromSearch = allAnnouncements
    .filter((a) => a.status === "active")
    .map((a) => a.id);
  const activeIdsFromCreation = activeAnnouncements.map((a) => a.id);
  TestValidator.equals(
    "should retrieve all active announcements",
    activeIdsFromSearch.length,
    activeIdsFromCreation.length,
  );
}
