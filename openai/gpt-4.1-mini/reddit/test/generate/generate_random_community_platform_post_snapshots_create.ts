import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_community_platform_post_snapshot } from "../prepare/prepare_random_community_platform_post_snapshot";

export async function generate_random_community_platform_post_snapshots_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformPostSnapshot.ICreate> | undefined;
  },
): Promise<ICommunityPlatformPostSnapshot> {
  const prepared: ICommunityPlatformPostSnapshot.ICreate =
    prepare_random_community_platform_post_snapshot(props.body);
  const result: ICommunityPlatformPostSnapshot =
    await api.functional.communityPlatform.postSnapshots.create(connection, {
      body: prepared,
    });
  return result;
}
