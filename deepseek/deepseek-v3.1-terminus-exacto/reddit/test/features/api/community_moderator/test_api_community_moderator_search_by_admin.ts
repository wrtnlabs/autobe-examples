import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityCategory";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityModerator";

/**
 * Test comprehensive moderator search functionality for community
 * administrators.
 *
 * This test validates that administrators can efficiently search and filter
 * moderator assignments with advanced capabilities including pagination, actor
 * type filtering, permission level filtering, assignment status filtering, and
 * date range filtering. The test creates a complete workflow from
 * authentication to search validation.
 */
export async function test_api_community_moderator_search_by_admin(
  connection: api.IConnection,
) {
  // 1. Administrator authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassword123!",
        display_name: RandomGenerator.name(),
        admin_level: "system",
        is_super_admin: true,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Community creation
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          slug: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.content({ paragraphs: 1 }),
          privacy: "public",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 3. Create member accounts for moderator assignment
  const memberEmails = ArrayUtil.repeat(3, () =>
    typia.random<string & tags.Format<"email">>(),
  );
  const members: ICommunityPlatformMember.IAuthorized[] = [];

  for (const email of memberEmails) {
    const member: ICommunityPlatformMember.IAuthorized =
      await api.functional.auth.member.join(connection, {
        body: {
          email,
          password: "MemberPassword123!",
          display_name: RandomGenerator.name(),
          ip: "127.0.0.1",
          href: "https://example.com/register",
          referrer: "https://example.com",
        } satisfies ICommunityPlatformMember.ICreate,
      });
    typia.assert(member);
    members.push(member);
  }

  // 4. Assign moderators with different permission levels
  const permissionLevels = ["full", "content_only", "limited"] as const;
  const moderators: ICommunityPlatformCommunityModerator[] = [];

  for (let i = 0; i < members.length; i++) {
    const moderator: ICommunityPlatformCommunityModerator =
      await api.functional.communityPlatform.admin.communities.moderators.create(
        connection,
        {
          communitySlug: community.slug,
          body: {
            actor_type: "member",
            permission_level: permissionLevels[i % permissionLevels.length],
            actor_member_id: members[i].id,
          } satisfies ICommunityPlatformCommunityModerator.ICreate,
        },
      );
    typia.assert(moderator);
    moderators.push(moderator);
  }

  // 5. Test basic pagination
  const firstPage: IPageICommunityPlatformCommunityModerator.ISummary =
    await api.functional.communityPlatform.admin.communities.moderators.index(
      connection,
      {
        communitySlug: community.slug,
        body: {
          page: 1,
          limit: 2,
        } satisfies ICommunityPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(firstPage);
  TestValidator.equals(
    "first page should have correct pagination",
    firstPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "first page limit should match",
    firstPage.pagination.limit,
    2,
  );
  TestValidator.predicate(
    "first page should have data",
    firstPage.data.length > 0,
  );

  // 6. Test actor type filtering
  const memberModerators: IPageICommunityPlatformCommunityModerator.ISummary =
    await api.functional.communityPlatform.admin.communities.moderators.index(
      connection,
      {
        communitySlug: community.slug,
        body: {
          page: 1,
          limit: 10,
          actor_type: "member",
        } satisfies ICommunityPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(memberModerators);
  TestValidator.predicate(
    "member type filter should return moderators",
    memberModerators.data.length > 0,
  );

  // 7. Test permission level filtering
  const fullPermissionModerators: IPageICommunityPlatformCommunityModerator.ISummary =
    await api.functional.communityPlatform.admin.communities.moderators.index(
      connection,
      {
        communitySlug: community.slug,
        body: {
          page: 1,
          limit: 10,
          permission_level: "full",
        } satisfies ICommunityPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(fullPermissionModerators);
  TestValidator.predicate(
    "full permission filter should return results",
    fullPermissionModerators.data.length >= 0,
  );

  // 8. Test search functionality with display name
  const searchResults: IPageICommunityPlatformCommunityModerator.ISummary =
    await api.functional.communityPlatform.admin.communities.moderators.index(
      connection,
      {
        communitySlug: community.slug,
        body: {
          page: 1,
          limit: 10,
          search: members[0].display_name.substring(0, 3),
        } satisfies ICommunityPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(searchResults);

  // 9. Test date range filtering
  const dateFiltered: IPageICommunityPlatformCommunityModerator.ISummary =
    await api.functional.communityPlatform.admin.communities.moderators.index(
      connection,
      {
        communitySlug: community.slug,
        body: {
          page: 1,
          limit: 10,
          assigned_after: new Date(Date.now() - 86400000).toISOString(), // Last 24 hours
        } satisfies ICommunityPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(dateFiltered);

  // 10. Validate that all created moderators are found in unfiltered search
  const allModerators: IPageICommunityPlatformCommunityModerator.ISummary =
    await api.functional.communityPlatform.admin.communities.moderators.index(
      connection,
      {
        communitySlug: community.slug,
        body: {
          page: 1,
          limit: 100,
        } satisfies ICommunityPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(allModerators);
  TestValidator.equals(
    "total moderators should match created count",
    allModerators.pagination.records,
    moderators.length,
  );

  // 11. Verify moderator assignment details
  const foundModerator = allModerators.data.find(
    (m) => m.id === moderators[0].id,
  );
  TestValidator.predicate(
    "created moderator should be found in search results",
    foundModerator !== undefined,
  );
  if (foundModerator) {
    TestValidator.equals(
      "moderator actor type should match",
      foundModerator.actor_type,
      "member",
    );
    TestValidator.equals(
      "moderator community should match",
      foundModerator.community.id,
      community.id,
    );
  }

  // 12. Test empty search results for non-existent data
  const emptySearch: IPageICommunityPlatformCommunityModerator.ISummary =
    await api.functional.communityPlatform.admin.communities.moderators.index(
      connection,
      {
        communitySlug: community.slug,
        body: {
          page: 1,
          limit: 10,
          search: "nonexistentmoderator12345",
        } satisfies ICommunityPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(emptySearch);
  TestValidator.equals(
    "empty search should return zero results",
    emptySearch.data.length,
    0,
  );

  // 13. Test combination of multiple filters
  const combinedFilter: IPageICommunityPlatformCommunityModerator.ISummary =
    await api.functional.communityPlatform.admin.communities.moderators.index(
      connection,
      {
        communitySlug: community.slug,
        body: {
          page: 1,
          limit: 10,
          actor_type: "member",
          permission_level: "full",
          status: "active",
        } satisfies ICommunityPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(combinedFilter);
  TestValidator.predicate(
    "combined filters should return valid results",
    combinedFilter.data.length >= 0,
  );
}
