import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationRole";
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

export async function test_api_community_moderation_roles_duplicate_assignment_rejected(
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
  adminConnection.headers ??= {};
  adminConnection.headers.Authorization = `Bearer ${admin.token.access}`;
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const memberId = typia.random<string & tags.Format<"uuid">>();
  const firstRequest = {
    communityPlatformMemberId: memberId,
    roleType: "moderator",
    page: 1,
    limit: 100,
  } satisfies ICommunityPlatformModerationRole.IRequest;
  const secondRequest = {
    communityPlatformMemberId: memberId,
    roleType: "moderator",
    page: 1,
    limit: 100,
  } satisfies ICommunityPlatformModerationRole.IRequest;
  const before =
    await api.functional.communityPlatform.admin.communities.moderationRoles.index(
      adminConnection,
      {
        communityId,
        body: firstRequest,
      },
    );
  typia.assert(before);
  await TestValidator.error(
    "duplicate moderation role assignment should be rejected",
    async () => {
      await api.functional.communityPlatform.admin.communities.moderationRoles.index(
        adminConnection,
        {
          communityId,
          body: secondRequest,
        },
      );
    },
  );
  const after =
    await api.functional.communityPlatform.admin.communities.moderationRoles.index(
      adminConnection,
      {
        communityId,
        body: firstRequest,
      },
    );
  typia.assert(after);
  TestValidator.equals(
    "moderation role list should remain unchanged",
    after,
    before,
  );
}
