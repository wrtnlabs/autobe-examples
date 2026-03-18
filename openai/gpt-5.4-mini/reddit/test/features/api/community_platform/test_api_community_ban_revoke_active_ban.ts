import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBan";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_community_platform_admin_communities_bans_create } from "../../../generate/generate_random_community_platform_admin_communities_bans_create";
import { prepare_random_community_platform_ban } from "../../../prepare/prepare_random_community_platform_ban";

export async function test_api_community_ban_revoke_active_ban(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234" satisfies string,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(admin);
  const communityId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const memberId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const createdBan =
    await api.functional.communityPlatform.admin.communities.bans.create(
      adminConnection,
      {
        communityId,
        body: {
          communityPlatformMemberId: memberId,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
          startedAt: new Date().toISOString(),
          endedAt: null,
        } satisfies ICommunityPlatformBan.ICreate,
      },
    );
  typia.assert(createdBan);
  const fetchedBan =
    await api.functional.communityPlatform.admin.communities.bans.at(
      adminConnection,
      {
        communityId,
        banId: createdBan.id,
      },
    );
  typia.assert(fetchedBan);
  TestValidator.equals("ban id before deletion", fetchedBan.id, createdBan.id);
  TestValidator.equals(
    "ban community before deletion",
    fetchedBan.community.id,
    communityId,
  );
  await api.functional.communityPlatform.admin.communities.bans.erase(
    adminConnection,
    {
      communityId,
      banId: createdBan.id,
    },
  );
  await TestValidator.error(
    "deleted ban should not be retrievable",
    async () => {
      await api.functional.communityPlatform.admin.communities.bans.at(
        adminConnection,
        {
          communityId,
          banId: createdBan.id,
        },
      );
    },
  );
}
