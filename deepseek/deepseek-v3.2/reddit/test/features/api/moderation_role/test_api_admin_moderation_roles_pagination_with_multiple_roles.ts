import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationRole";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformModerationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModerationRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_moderation_roles_create } from "../../../generate/generate_random_community_platform_member_moderation_roles_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_moderation_role } from "../../../prepare/prepare_random_community_platform_moderation_role";

export async function test_api_admin_moderation_roles_pagination_with_multiple_roles(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account for community creation
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.alphaNumeric(10),
      nickname: RandomGenerator.name(1),
      href: "https://test.com",
      referrer: "https://test.com/referrer",
      ip: "127.0.0.1",
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(member);
  // 2. Create community with authenticated member as owner
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(12).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Create additional member accounts for role assignments (5+ members)
  const additionalMembers: ICommunityPlatformMember.IAuthorized[] = [];
  for (let i = 0; i < 6; i++) {
    const additionalMemberConnection: api.IConnection = {
      host: connection.host,
    };
    const additionalMember = await authorize_member_join(
      additionalMemberConnection,
      {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: "password123",
          username: RandomGenerator.alphaNumeric(10),
          nickname: RandomGenerator.name(1),
          href: "https://test.com",
          referrer: "https://test.com/referrer",
          ip: "127.0.0.1",
        } satisfies ICommunityPlatformMember.IJoin,
      },
    );
    typia.assert(additionalMember);
    additionalMembers.push(additionalMember);
  }
  // 4. Assign multiple moderation roles (moderator) to different members
  const assignedRoleIds: string[] = [];
  for (const additionalMember of additionalMembers) {
    const roleConnection: api.IConnection = { host: connection.host };
    roleConnection.headers = {
      Authorization: memberConnection.headers?.Authorization ?? "", // FIX: Use nullish coalescing with empty string as fallback
    };
    const role =
      await generate_random_community_platform_member_moderation_roles_create(
        roleConnection,
        {
          params: { communityId: community.id },
          body: {
            memberId: additionalMember.id,
            roleType: "moderator",
          } satisfies ICommunityPlatformModerationRole.ICreate,
        },
      );
    typia.assert(role);
    assignedRoleIds.push(role.id);
  }
  // 5. Authenticate as admin using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "admin123",
    } satisfies ICommunityPlatformAdmin.ILogin,
  });
  // 6. Test pagination with limit=2: first page
  const firstPage =
    await api.functional.communityPlatform.admin.moderation_roles.index(
      adminConnection,
      {
        communityId: community.id,
        body: {
          limit: 2 satisfies number as number,
          page: 1 satisfies number as number,
          sort: "created_at",
        } satisfies ICommunityPlatformModerationRole.IRequest,
      },
    );
  typia.assert(firstPage);
  TestValidator.equals("first page limit", firstPage.pagination.limit, 2);
  TestValidator.equals(
    "first page current page",
    firstPage.pagination.current,
    1,
  );
  TestValidator.equals("first page data length", firstPage.data.length, 2);
  TestValidator.equals("total records", firstPage.pagination.records, 7); // 1 owner + 6 moderators
  TestValidator.equals(
    "total pages",
    firstPage.pagination.pages,
    Math.ceil(7 / 2),
  ); // 4 pages
  // 7. Test second page
  const secondPage =
    await api.functional.communityPlatform.admin.moderation_roles.index(
      adminConnection,
      {
        communityId: community.id,
        body: {
          limit: 2 satisfies number as number,
          page: 2 satisfies number as number,
          sort: "created_at",
        } satisfies ICommunityPlatformModerationRole.IRequest,
      },
    );
  typia.assert(secondPage);
  TestValidator.equals("second page limit", secondPage.pagination.limit, 2);
  TestValidator.equals(
    "second page current page",
    secondPage.pagination.current,
    2,
  );
  TestValidator.equals("second page data length", secondPage.data.length, 2);
  // 8. Test remaining pages to ensure all roles are accessible
  const allRoles: ICommunityPlatformModerationRole.ISummary[] = [];
  for (let page = 1; page <= firstPage.pagination.pages; page++) {
    const pageResult =
      await api.functional.communityPlatform.admin.moderation_roles.index(
        adminConnection,
        {
          communityId: community.id,
          body: {
            limit: 2 satisfies number as number,
            page: page satisfies number as number,
            sort: "created_at",
          } satisfies ICommunityPlatformModerationRole.IRequest,
        },
      );
    typia.assert(pageResult);
    allRoles.push(...pageResult.data);
  }
  TestValidator.equals("total roles retrieved", allRoles.length, 7);
  // Verify no duplicates by checking unique IDs
  const uniqueIds = new Set(allRoles.map((role) => role.id));
  TestValidator.equals("no duplicate roles", uniqueIds.size, allRoles.length);
  // Verify all assigned moderator IDs are present
  const retrievedRoleIds = allRoles.map((role) => role.id);
  for (const assignedId of assignedRoleIds) {
    TestValidator.predicate(
      "assigned role present",
      retrievedRoleIds.includes(assignedId),
    );
  }
  // 9. Test sorting by role_type
  const sortedByRoleType =
    await api.functional.communityPlatform.admin.moderation_roles.index(
      adminConnection,
      {
        communityId: community.id,
        body: {
          limit: 7 satisfies number as number,
          page: 1 satisfies number as number,
          sort: "role_type",
        } satisfies ICommunityPlatformModerationRole.IRequest,
      },
    );
  typia.assert(sortedByRoleType);
  // Verify ordering: moderators should come before owner or vice versa
  // Check that roles are sorted alphabetically by roleType
  const roleTypes = sortedByRoleType.data.map((role) => role.roleType);
  for (let i = 1; i < roleTypes.length; i++) {
    TestValidator.predicate(
      "role_type sorted",
      roleTypes[i] >= roleTypes[i - 1],
    );
  }
}
