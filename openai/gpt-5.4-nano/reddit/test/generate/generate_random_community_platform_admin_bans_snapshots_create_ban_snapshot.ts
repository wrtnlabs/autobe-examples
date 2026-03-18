import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunityBanSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBanSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_community_platform_community_ban_snapshot } from "../prepare/prepare_random_community_platform_community_ban_snapshot";

export async function generate_random_community_platform_admin_bans_snapshots_create_ban_snapshot(
  connection: api.IConnection,
  props: {
    body?:
      | DeepPartial<ICommunityPlatformCommunityBanSnapshot.ICreate>
      | undefined;
    params: {
      banId: string;
    };
  },
): Promise<ICommunityPlatformCommunityBanSnapshot> {
  const prepared: ICommunityPlatformCommunityBanSnapshot.ICreate =
    prepare_random_community_platform_community_ban_snapshot(props.body);
  const result: ICommunityPlatformCommunityBanSnapshot =
    await api.functional.communityPlatform.admin.bans.snapshots.createBanSnapshot(
      connection,
      {
        banId: props.params.banId,
        body: prepared,
      },
    );
  return result;
}
