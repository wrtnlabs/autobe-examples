import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
import type { ICommunityPlatformCommunityBanSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBanSnapshot";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityBanSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityBanSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_community_platform_admin_communities_bans_create } from "../../../generate/generate_random_community_platform_admin_communities_bans_create";
import { prepare_random_community_platform_community_ban } from "../../../prepare/prepare_random_community_platform_community_ban";

export async function test_api_community_ban_snapshot_list_community_scope_mismatch(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16) satisfies string as string,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  const preparedCommunityId = typia.random<string & tags.Format<"uuid">>();
  const createdBan =
    await generate_random_community_platform_admin_communities_bans_create(
      adminConnection,
      {
        params: {
          communityId: preparedCommunityId,
        },
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
          started_at: new Date().toISOString(),
          expired_at: null,
        },
      },
    );
  typia.assert(createdBan);
  const sourceCommunityId = createdBan.community.id;
  const mismatchedCommunityId = typia.random<string & tags.Format<"uuid">>();
  TestValidator.notEquals(
    "community ids must differ for mismatch lookup",
    sourceCommunityId,
    mismatchedCommunityId,
  );
  TestValidator.equals(
    "ban belongs to source community",
    createdBan.community.id,
    sourceCommunityId,
  );
  const requestBody = {
    page: 1 satisfies number as number,
    limit: 10 satisfies number as number,
  } satisfies ICommunityPlatformCommunityBanSnapshot.IRequest;
  await TestValidator.httpError(
    "snapshot lookup must reject mismatched community and ban pairing",
    [403, 404],
    async () => {
      await api.functional.communityPlatform.admin.communities.bans.snapshots.index(
        adminConnection,
        {
          communityId: mismatchedCommunityId,
          banId: createdBan.id,
          body: requestBody,
        },
      );
    },
  );
}
