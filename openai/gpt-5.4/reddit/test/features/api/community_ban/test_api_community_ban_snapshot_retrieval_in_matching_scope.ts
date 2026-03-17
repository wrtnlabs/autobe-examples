import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
import type { ICommunityPlatformCommunityBanSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBanSnapshot";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import type { ICommunityPlatformProfileFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfileFile";
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
import { prepare_random_community_platform_community_ban } from "../../../prepare/prepare_random_community_platform_community_ban";

export async function test_api_community_ban_snapshot_retrieval_in_matching_scope(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "AdminTest1234!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const createdBan =
    await generate_random_community_platform_admin_communities_bans_create(
      adminConnection,
      {
        params: {
          communityId,
        },
      },
    );
  typia.assert(createdBan);
  const beforeBan = {
    id: createdBan.id,
    communityId: createdBan.community.id,
    memberId: createdBan.member.id,
    reason: createdBan.reason,
    status: createdBan.status,
    started_at: createdBan.started_at,
    expired_at: createdBan.expired_at,
    lifted_at: createdBan.lifted_at,
    created_at: createdBan.created_at,
    updated_at: createdBan.updated_at,
    deleted_at: createdBan.deleted_at,
  };
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "unknown snapshot id under the specified parent scope should be rejected",
    [403, 404],
    async () => {
      await api.functional.communityPlatform.admin.communities.bans.snapshots.at(
        adminConnection,
        {
          communityId: createdBan.community.id,
          banId: createdBan.id,
          snapshotId,
        },
      );
    },
  );
  TestValidator.equals("parent ban id preserved", createdBan.id, beforeBan.id);
  TestValidator.equals(
    "parent community relation preserved",
    createdBan.community.id,
    beforeBan.communityId,
  );
  TestValidator.equals(
    "parent member relation preserved",
    createdBan.member.id,
    beforeBan.memberId,
  );
  TestValidator.equals(
    "parent ban reason preserved",
    createdBan.reason,
    beforeBan.reason,
  );
  TestValidator.equals(
    "parent ban status preserved",
    createdBan.status,
    beforeBan.status,
  );
  TestValidator.equals(
    "parent ban started_at preserved",
    createdBan.started_at,
    beforeBan.started_at,
  );
  TestValidator.equals(
    "parent ban expired_at preserved",
    createdBan.expired_at,
    beforeBan.expired_at,
  );
  TestValidator.equals(
    "parent ban lifted_at preserved",
    createdBan.lifted_at,
    beforeBan.lifted_at,
  );
  TestValidator.equals(
    "parent ban created_at preserved",
    createdBan.created_at,
    beforeBan.created_at,
  );
  TestValidator.equals(
    "parent ban updated_at preserved",
    createdBan.updated_at,
    beforeBan.updated_at,
  );
  TestValidator.equals(
    "parent ban deleted_at preserved",
    createdBan.deleted_at,
    beforeBan.deleted_at,
  );
}
