import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationRole";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_community_platform_admin_communities_moderation_roles_create } from "../../../generate/generate_random_community_platform_admin_communities_moderation_roles_create";
import { prepare_random_community_platform_moderation_role } from "../../../prepare/prepare_random_community_platform_moderation_role";

export async function test_api_moderation_role_update_owner_hierarchy_protected(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(admin);
  const communityId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const ownerRole: ICommunityPlatformModerationRole =
    await generate_random_community_platform_admin_communities_moderation_roles_create(
      adminConnection,
      {
        params: { communityId },
        body: {
          communityPlatformMemberId: typia.random<
            string & tags.Format<"uuid">
          >(),
          roleType: "owner",
        } satisfies ICommunityPlatformModerationRole.ICreate,
      },
    );
  typia.assert(ownerRole);
  await TestValidator.httpError(
    "owner moderation role hierarchy should be protected",
    [400, 403, 409, 422],
    async () => {
      await api.functional.communityPlatform.admin.communities.moderationRoles.update(
        adminConnection,
        {
          communityId,
          moderationRoleId: ownerRole.id,
          body: {
            role_type: "moderator",
          } satisfies ICommunityPlatformModerationRole.IUpdate,
        },
      );
    },
  );
}
