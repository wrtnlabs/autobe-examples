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
import { generate_random_community_platform_admin_communities_bans_snapshots_create } from "../../../generate/generate_random_community_platform_admin_communities_bans_snapshots_create";
import { prepare_random_community_platform_community_ban } from "../../../prepare/prepare_random_community_platform_community_ban";
import { prepare_random_community_platform_community_ban_snapshot } from "../../../prepare/prepare_random_community_platform_community_ban_snapshot";

export async function test_api_community_ban_snapshot_create_with_moderation_context(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(adminAuth);
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
  const snapshot =
    await generate_random_community_platform_admin_communities_bans_snapshots_create(
      adminConnection,
      {
        params: {
          communityId,
          banId: createdBan.id,
        },
      },
    );
  typia.assert(snapshot);
  TestValidator.notEquals(
    "snapshot id must be distinct from parent ban id",
    snapshot.id,
    createdBan.id,
  );
  TestValidator.equals(
    "snapshot communityBan matches created ban id",
    snapshot.communityBan.id,
    createdBan.id,
  );
  TestValidator.equals(
    "embedded community remains unchanged",
    snapshot.communityBan.community,
    createdBan.community,
  );
  TestValidator.equals(
    "embedded banned member remains unchanged",
    snapshot.communityBan.member,
    createdBan.member,
  );
  TestValidator.equals(
    "ban reason remains unchanged after snapshot creation",
    snapshot.communityBan.reason,
    createdBan.reason,
  );
  TestValidator.equals(
    "ban status remains unchanged after snapshot creation",
    snapshot.communityBan.status,
    createdBan.status,
  );
  TestValidator.equals(
    "ban started_at remains unchanged after snapshot creation",
    snapshot.communityBan.started_at,
    createdBan.started_at,
  );
  TestValidator.equals(
    "ban expired_at remains unchanged after snapshot creation",
    snapshot.communityBan.expired_at,
    createdBan.expired_at,
  );
  TestValidator.equals(
    "ban lifted_at remains unchanged after snapshot creation",
    snapshot.communityBan.lifted_at,
    createdBan.lifted_at,
  );
  if (snapshot.createdByMember !== null) {
    TestValidator.notEquals(
      "creator attribution should not be the banned member",
      snapshot.createdByMember.id,
      createdBan.member.id,
    );
  }
}
