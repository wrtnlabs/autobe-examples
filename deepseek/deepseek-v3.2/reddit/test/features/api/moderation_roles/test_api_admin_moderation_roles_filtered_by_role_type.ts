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

export async function test_api_admin_moderation_roles_filtered_by_role_type(
  connection: api.IConnection,
): Promise<void> {
  // Setup admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: "https://test.com",
      referrer: "https://referrer.test.com",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Create first member (will be community owner)
  const member1Connection: api.IConnection = { host: connection.host };
  const member1 = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      username: RandomGenerator.alphaNumeric(12),
      nickname: RandomGenerator.name(1),
      href: "https://test.com",
      referrer: "https://referrer.test.com",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  // Create community with first member as owner
  const community =
    await generate_random_community_platform_member_communities_create(
      member1Connection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(8).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Create second member (will be moderator)
  const member2Connection: api.IConnection = { host: connection.host };
  const member2 = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      username: RandomGenerator.alphaNumeric(12),
      nickname: RandomGenerator.name(1),
      href: "https://test.com",
      referrer: "https://referrer.test.com",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  // Assign second member as moderator in the community
  const moderatorRole =
    await generate_random_community_platform_member_moderation_roles_create(
      member1Connection,
      {
        params: { communityId: community.id },
        body: {
          memberId: member2.id,
          roleType: "moderator",
        } satisfies ICommunityPlatformModerationRole.ICreate,
      },
    );
  typia.assert(moderatorRole);
  // Test filtering for 'owner' role type only
  const ownerFiltered =
    await api.functional.communityPlatform.admin.moderation_roles.index(
      adminConnection,
      {
        communityId: community.id,
        body: {
          role_type: "owner",
          active: true,
          limit: 10,
          page: 1,
        } satisfies ICommunityPlatformModerationRole.IRequest,
      },
    );
  typia.assert(ownerFiltered);
  // Validate owner filtering results
  TestValidator.equals(
    "owner filter should return exactly one role",
    ownerFiltered.data.length,
    1,
  );
  TestValidator.equals(
    "owner filter should have roleType 'owner'",
    ownerFiltered.data[0].roleType,
    "owner",
  );
  TestValidator.equals(
    "owner role should belong to first member",
    ownerFiltered.data[0].member.id,
    member1.id,
  );
  // Test filtering for 'moderator' role type only
  const moderatorFiltered =
    await api.functional.communityPlatform.admin.moderation_roles.index(
      adminConnection,
      {
        communityId: community.id,
        body: {
          role_type: "moderator",
          active: true,
          limit: 10,
          page: 1,
        } satisfies ICommunityPlatformModerationRole.IRequest,
      },
    );
  typia.assert(moderatorFiltered);
  // Validate moderator filtering results
  TestValidator.equals(
    "moderator filter should return exactly one role",
    moderatorFiltered.data.length,
    1,
  );
  TestValidator.equals(
    "moderator filter should have roleType 'moderator'",
    moderatorFiltered.data[0].roleType,
    "moderator",
  );
  TestValidator.equals(
    "moderator role should belong to second member",
    moderatorFiltered.data[0].member.id,
    member2.id,
  );
  // Test both active and inactive filtering
  const allActiveRoles =
    await api.functional.communityPlatform.admin.moderation_roles.index(
      adminConnection,
      {
        communityId: community.id,
        body: {
          active: true,
          limit: 10,
          page: 1,
        } satisfies ICommunityPlatformModerationRole.IRequest,
      },
    );
  typia.assert(allActiveRoles);
  TestValidator.equals(
    "active filter should return 2 roles",
    allActiveRoles.data.length,
    2,
  );
}
