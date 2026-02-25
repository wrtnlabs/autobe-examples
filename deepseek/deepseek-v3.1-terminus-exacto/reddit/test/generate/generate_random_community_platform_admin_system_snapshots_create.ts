import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformSystemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_community_platform_system_snapshot } from "../prepare/prepare_random_community_platform_system_snapshot";

export async function generate_random_community_platform_admin_system_snapshots_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformSystemSnapshot.ICreate>;
  },
): Promise<ICommunityPlatformSystemSnapshot> {
  const prepared: ICommunityPlatformSystemSnapshot.ICreate =
    prepare_random_community_platform_system_snapshot(props.body);
  const result: ICommunityPlatformSystemSnapshot =
    await api.functional.communityPlatform.admin.system_snapshots.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
