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

export async function test_api_community_announcements_search_combined_filters(
  connection: api.IConnection,
): Promise<void> {
  // Setup admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Setup user connection
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  // Create community
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Create test announcements with overlapping characteristics
  const announcements = await ArrayUtil.asyncRepeat(6, async (index) => {
    const title =
      index % 2 === 0
        ? `Important update ${index}`
        : `Regular announcement ${index}`;
    const content =
      index % 2 === 0
        ? `This is an important update about community rules`
        : `This is a regular announcement`;
    const status = index < 2 ? "active" : index < 4 ? "draft" : "inactive";
    const is_pinned = index % 3 === 0;
    const announcement =
      await generate_random_community_platform_admin_communities_announcements_create(
        adminConnection,
        {
          body: {
            title,
            content,
            is_pinned,
            status: status as "active" | "inactive" | "draft",
          } satisfies ICommunityPlatformCommunityAnnouncement.ICreate,
          params: {
            communityId: community.id,
          },
        },
      );
    typia.assert(announcement);
    return announcement;
  });
  // Test 1: Search for keyword 'update' with status='active' and is_pinned=false
  const search1 =
    await api.functional.communityPlatform.communities.announcements.search(
      adminConnection,
      {
        communityId: community.id,
        body: {
          search: "update",
          status: "active",
          is_pinned: false,
        } satisfies ICommunityPlatformCommunityAnnouncement.IRequest,
      },
    );
  typia.assert(search1);
  // Should find announcements with 'update' in title, status=active, and not pinned
  const expectedUpdateAnnouncements = announcements.filter(
    (a) => a.title.includes("update") && a.status === "active" && !a.is_pinned,
  );
  TestValidator.equals(
    "search with update keyword",
    search1.data.length,
    expectedUpdateAnnouncements.length,
  );
  // Test 2: Search for empty search term with status='draft' and is_pinned=true
  const search2 =
    await api.functional.communityPlatform.communities.announcements.search(
      adminConnection,
      {
        communityId: community.id,
        body: {
          search: "",
          status: "draft",
          is_pinned: true,
        } satisfies ICommunityPlatformCommunityAnnouncement.IRequest,
      },
    );
  typia.assert(search2);
  // Should find draft announcements that are pinned
  const expectedDraftPinned = announcements.filter(
    (a) => a.status === "draft" && a.is_pinned,
  );
  TestValidator.equals(
    "search with empty term",
    search2.data.length,
    expectedDraftPinned.length,
  );
  // Test 3: Search with null/undefined filter values
  const search3 =
    await api.functional.communityPlatform.communities.announcements.search(
      adminConnection,
      {
        communityId: community.id,
        body: {
          search: undefined,
          status: undefined,
          is_pinned: undefined,
        } satisfies ICommunityPlatformCommunityAnnouncement.IRequest,
      },
    );
  typia.assert(search3);
  // Should return all announcements when no filters applied
  TestValidator.equals(
    "search with no filters",
    search3.data.length,
    announcements.length,
  );
  // Test 4: Search with non-matching term
  const search4 =
    await api.functional.communityPlatform.communities.announcements.search(
      adminConnection,
      {
        communityId: community.id,
        body: {
          search: "nonexistentkeyword12345",
          status: undefined,
          is_pinned: undefined,
        } satisfies ICommunityPlatformCommunityAnnouncement.IRequest,
      },
    );
  typia.assert(search4);
  // Should return empty array for non-matching search term
  TestValidator.equals("search with non-matching term", search4.data.length, 0);
  TestValidator.predicate(
    "pagination metadata present",
    search4.pagination.records === 0,
  );
  // Validate author information is correctly joined
  if (search1.data.length > 0) {
    const firstAnnouncement = search1.data[0];
    TestValidator.predicate(
      "author has display_name",
      firstAnnouncement.author.display_name !== null,
    );
    TestValidator.predicate(
      "author has avatar_url",
      firstAnnouncement.author.avatar_url !== null,
    );
    TestValidator.predicate(
      "author has karma",
      typeof firstAnnouncement.author.karma === "number",
    );
    TestValidator.predicate(
      "author has created_at",
      typeof firstAnnouncement.author.created_at === "string",
    );
  }
  // Test pagination
  const searchWithPagination =
    await api.functional.communityPlatform.communities.announcements.search(
      adminConnection,
      {
        communityId: community.id,
        body: {
          search: undefined,
          status: undefined,
          is_pinned: undefined,
          page: 1,
          limit: 2,
        } satisfies ICommunityPlatformCommunityAnnouncement.IRequest,
      },
    );
  typia.assert(searchWithPagination);
  TestValidator.equals("pagination limit", searchWithPagination.data.length, 2);
  TestValidator.predicate(
    "pagination records count",
    searchWithPagination.pagination.records === announcements.length,
  );
  TestValidator.predicate(
    "pagination pages count",
    searchWithPagination.pagination.pages ===
      Math.ceil(announcements.length / 2),
  );
}
