import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityCategory";
import type { ICommunityPlatformCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMember";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityMember";

/**
 * Comprehensive test of administrator member search functionality
 *
 * Validates that administrators can search community members with advanced
 * filtering, sorting, and pagination capabilities. Tests various search
 * scenarios including role-based filtering, subscription status filtering, and
 * text search.
 */
export async function test_api_community_members_search_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate as administrator with proper session context
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

  // Step 2: Create a community as foundation for member management
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

  // Step 3: Create multiple members with varying roles and subscription preferences
  const members: ICommunityPlatformMember.IAuthorized[] = [];
  const memberRoles = [
    "member",
    "approved_submitter",
    "trusted_member",
  ] as const;

  for (let i = 0; i < 5; i++) {
    const memberEmail = typia.random<string & tags.Format<"email">>();
    const member: ICommunityPlatformMember.IAuthorized =
      await api.functional.auth.member.join(connection, {
        body: {
          email: memberEmail,
          password: "MemberPassword123!",
          display_name: RandomGenerator.name(),
          href: "https://example.com/register",
          referrer: "https://example.com",
        } satisfies ICommunityPlatformMember.ICreate,
      });
    typia.assert(member);
    members.push(member);

    // Add member to community with varying roles and subscription preferences
    const role = RandomGenerator.pick(memberRoles);
    const isSubscribed = i % 2 === 0;

    const communityMember: ICommunityPlatformCommunityMember =
      await api.functional.communityPlatform.member.communities.members.create(
        connection,
        {
          communitySlug: community.slug,
          body: {
            member: {
              id: member.id,
              email: member.email,
              display_name: member.display_name,
              karma_score: member.karma_score,
              is_verified: member.is_verified,
              last_active_at: member.last_active_at ?? new Date().toISOString(),
              created_at: member.created_at,
            } satisfies ICommunityPlatformMember.ISummary,
            role: role,
            is_subscribed: isSubscribed,
          } satisfies ICommunityPlatformCommunityMember.ICreate,
        },
      );
    typia.assert(communityMember);
  }

  // Step 4: Perform comprehensive member search operations as administrator

  // Test 1: Search all members (no filters)
  const allMembers: IPageICommunityPlatformCommunityMember.ISummary =
    await api.functional.communityPlatform.admin.communities.members.index(
      connection,
      {
        communitySlug: community.slug,
        body: {
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformCommunityMember.IRequest,
      },
    );
  typia.assert(allMembers);
  TestValidator.equals(
    "all members count matches created members",
    allMembers.pagination.records,
    5,
  );

  // Test 2: Search with role filter
  const memberRoleFilter: IPageICommunityPlatformCommunityMember.ISummary =
    await api.functional.communityPlatform.admin.communities.members.index(
      connection,
      {
        communitySlug: community.slug,
        body: {
          role: "member",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformCommunityMember.IRequest,
      },
    );
  typia.assert(memberRoleFilter);

  // Test 3: Search with subscription filter
  const subscribedFilter: IPageICommunityPlatformCommunityMember.ISummary =
    await api.functional.communityPlatform.admin.communities.members.index(
      connection,
      {
        communitySlug: community.slug,
        body: {
          is_subscribed: true,
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformCommunityMember.IRequest,
      },
    );
  typia.assert(subscribedFilter);

  // Test 4: Search with text filter (using member display names)
  if (members.length > 0) {
    const searchTerm = members[0].display_name.substring(0, 3);
    const textSearch: IPageICommunityPlatformCommunityMember.ISummary =
      await api.functional.communityPlatform.admin.communities.members.index(
        connection,
        {
          communitySlug: community.slug,
          body: {
            search: searchTerm,
            page: 1,
            limit: 10,
          } satisfies ICommunityPlatformCommunityMember.IRequest,
        },
      );
    typia.assert(textSearch);
  }

  // Test 5: Search with combined filters
  const combinedSearch: IPageICommunityPlatformCommunityMember.ISummary =
    await api.functional.communityPlatform.admin.communities.members.index(
      connection,
      {
        communitySlug: community.slug,
        body: {
          role: "trusted_member",
          is_subscribed: true,
          order_by: "joined_at",
          order: "desc",
          page: 1,
          limit: 5,
        } satisfies ICommunityPlatformCommunityMember.IRequest,
      },
    );
  typia.assert(combinedSearch);

  // Validate pagination structure
  TestValidator.predicate(
    "pagination has valid current page",
    allMembers.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination has valid limit",
    allMembers.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination records count is correct",
    allMembers.pagination.records === 5,
  );
  TestValidator.predicate(
    "pagination pages calculation is correct",
    allMembers.pagination.pages >= 1,
  );

  // Validate member data structure in search results
  if (allMembers.data.length > 0) {
    const firstMember = allMembers.data[0];
    TestValidator.predicate("member has valid ID", firstMember.id.length > 0);
    TestValidator.predicate(
      "member has community reference",
      firstMember.community_platform_community_id.length > 0,
    );
    TestValidator.predicate(
      "member has member reference",
      firstMember.community_platform_member_id.length > 0,
    );
    TestValidator.predicate(
      "member has valid role",
      ["member", "approved_submitter", "trusted_member"].includes(
        firstMember.role,
      ),
    );
    TestValidator.predicate(
      "member has valid join timestamp",
      firstMember.joined_at.length > 0,
    );
    TestValidator.predicate(
      "member has subscription status",
      typeof firstMember.is_subscribed === "boolean",
    );
  }
}
