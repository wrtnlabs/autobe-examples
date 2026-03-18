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

export async function test_api_moderation_role_update_success(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(authorized);
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const created =
    await generate_random_community_platform_admin_communities_moderation_roles_create(
      adminConnection,
      {
        params: { communityId },
        body: {
          communityPlatformMemberId: typia.random<
            string & tags.Format<"uuid">
          >(),
          roleType: "moderator",
        } satisfies ICommunityPlatformModerationRole.ICreate,
      },
    );
  typia.assert(created);
  const beforeUpdatedAt = created.updated_at;
  const updated =
    await api.functional.communityPlatform.admin.communities.moderationRoles.update(
      adminConnection,
      {
        communityId,
        moderationRoleId: created.id,
        body: {
          role_type: "owner",
        } satisfies ICommunityPlatformModerationRole.IUpdate,
      },
    );
  typia.assert(updated);
  TestValidator.equals(
    "community id preserved",
    updated.community.id,
    created.community.id,
  );
  TestValidator.equals(
    "community preserved",
    updated.community,
    created.community,
  );
  TestValidator.equals("member preserved", updated.member, created.member);
  TestValidator.equals("record id preserved", updated.id, created.id);
  TestValidator.equals("role updated", updated.role_type, "owner");
  TestValidator.predicate(
    "updated_at should be refreshed",
    updated.updated_at >= beforeUpdatedAt,
  );
  TestValidator.equals("not deleted", updated.deleted_at, created.deleted_at);
}
