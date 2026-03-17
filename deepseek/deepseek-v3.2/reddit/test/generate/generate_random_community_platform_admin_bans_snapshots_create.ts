import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBan";
import type { ICommunityPlatformBanSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBanSnapshot";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_community_platform_ban_snapshot } from "../prepare/prepare_random_community_platform_ban_snapshot";

export async function generate_random_community_platform_admin_bans_snapshots_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformBanSnapshot.ICreate> | undefined;
    params: {
      communityId: string;
      banId: string;
    };
  },
): Promise<ICommunityPlatformBanSnapshot> {
  const prepared: ICommunityPlatformBanSnapshot.ICreate =
    prepare_random_community_platform_ban_snapshot(props.body);
  const result: ICommunityPlatformBanSnapshot =
    await api.functional.communityPlatform.admin.bans.snapshots.create(
      connection,
      {
        communityId: props.params.communityId,
        banId: props.params.banId,
        body: prepared,
      },
    );
  return result;
}
