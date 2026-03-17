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

export async function test_api_community_ban_snapshot_hierarchy_mismatch_not_found(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Admin1234!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(authorized);
  const requestedCommunityIdA = typia.random<string & tags.Format<"uuid">>();
  const requestedCommunityIdB = typia.random<string & tags.Format<"uuid">>();
  const banA =
    await generate_random_community_platform_admin_communities_bans_create(
      adminConnection,
      {
        params: {
          communityId: requestedCommunityIdA,
        },
      },
    );
  typia.assert(banA);
  const banB =
    await generate_random_community_platform_admin_communities_bans_create(
      adminConnection,
      {
        params: {
          communityId: requestedCommunityIdB,
        },
      },
    );
  typia.assert(banB);
  const snapshotA =
    await generate_random_community_platform_admin_communities_bans_snapshots_create(
      adminConnection,
      {
        params: {
          communityId: banA.community.id,
          banId: banA.id,
        },
      },
    );
  typia.assert(snapshotA);
  const snapshotB =
    await generate_random_community_platform_admin_communities_bans_snapshots_create(
      adminConnection,
      {
        params: {
          communityId: banB.community.id,
          banId: banB.id,
        },
      },
    );
  typia.assert(snapshotB);
  const found =
    await api.functional.communityPlatform.admin.communities.bans.snapshots.at(
      adminConnection,
      {
        communityId: banA.community.id,
        banId: banA.id,
        snapshotId: snapshotA.id,
      },
    );
  typia.assert(found);
  TestValidator.equals("snapshot id matches", found.id, snapshotA.id);
  TestValidator.equals("parent ban matches", found.communityBan.id, banA.id);
  TestValidator.equals(
    "parent community matches",
    found.communityBan.community.id,
    banA.community.id,
  );
  await TestValidator.httpError(
    "snapshot is not found when ban does not own the snapshot",
    404,
    async () => {
      await api.functional.communityPlatform.admin.communities.bans.snapshots.at(
        adminConnection,
        {
          communityId: banA.community.id,
          banId: banB.id,
          snapshotId: snapshotA.id,
        },
      );
    },
  );
  const mismatchedCommunityId =
    banA.community.id !== banB.community.id
      ? banB.community.id
      : typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "snapshot is not found when community does not own the ban",
    404,
    async () => {
      await api.functional.communityPlatform.admin.communities.bans.snapshots.at(
        adminConnection,
        {
          communityId: mismatchedCommunityId,
          banId: banA.id,
          snapshotId: snapshotA.id,
        },
      );
    },
  );
  TestValidator.notEquals(
    "independent contexts use different bans",
    banA.id,
    banB.id,
  );
  TestValidator.notEquals(
    "independent contexts use different snapshots",
    snapshotA.id,
    snapshotB.id,
  );
}
