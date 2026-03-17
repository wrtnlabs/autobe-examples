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

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_moderation_roles_create } from "../../../generate/generate_random_community_platform_member_moderation_roles_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_moderation_role } from "../../../prepare/prepare_random_community_platform_moderation_role";

export async function test_api_community_moderation_roles_list_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create owner member account
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {});
  typia.assert(owner);
  // 2. Create community with owner
  const community =
    await generate_random_community_platform_member_communities_create(
      ownerConnection,
      {},
    );
  typia.assert(community);
  // 3. Create moderator member account
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_member_join(moderatorConnection, {});
  typia.assert(moderator);
  // 4. Owner assigns moderator role to second member
  const moderatorRole =
    await generate_random_community_platform_member_moderation_roles_create(
      ownerConnection,
      {
        params: { communityId: community.id },
        body: {
          memberId: moderator.id satisfies string as string,
          roleType: "moderator",
        } satisfies ICommunityPlatformModerationRole.ICreate,
      },
    );
  typia.assert(moderatorRole);
  // 5. Moderator calls moderation roles list endpoint
  const rolesPage =
    await api.functional.communityPlatform.member.moderation_roles.index(
      moderatorConnection,
      {
        communityId: community.id satisfies string as string,
        body: {
          page: 1 satisfies number as number,
          limit: 20 satisfies number as number,
          active: true,
        } satisfies ICommunityPlatformModerationRole.IRequest,
      },
    );
  typia.assert(rolesPage);
  // 6. Validate pagination metadata
  TestValidator.equals("page should have data", rolesPage.data.length, 2);
  TestValidator.equals(
    "total records should be 2",
    rolesPage.pagination.records,
    2,
  );
  TestValidator.equals(
    "current page should be 1",
    rolesPage.pagination.current,
    1,
  );
  TestValidator.equals("limit should be 20", rolesPage.pagination.limit, 20);
  TestValidator.equals(
    "total pages should be 1",
    rolesPage.pagination.pages,
    1,
  );
  // 7. Find owner and moderator roles in response
  const ownerRole = rolesPage.data.find((role) => role.roleType === "owner");
  const moderatorRoleInList = rolesPage.data.find(
    (role) => role.roleType === "moderator",
  );
  TestValidator.predicate(
    "owner role should exist",
    () => ownerRole !== undefined,
  );
  TestValidator.predicate(
    "moderator role should exist",
    () => moderatorRoleInList !== undefined,
  );
  // 8. Validate owner role details
  if (ownerRole) {
    TestValidator.equals(
      "owner role member ID should match community owner",
      ownerRole.member.id,
      owner.id,
    );
    TestValidator.equals(
      "owner role should have no assigner (auto-created)",
      ownerRole.assignedBy,
      null,
    );
  }
  // 9. Validate moderator role details
  if (moderatorRoleInList) {
    TestValidator.equals(
      "moderator role member ID should match assigned member",
      moderatorRoleInList.member.id,
      moderator.id,
    );
    TestValidator.equals(
      "moderator role assigner should be owner",
      moderatorRoleInList.assignedBy?.id,
      owner.id,
    );
  }
}
