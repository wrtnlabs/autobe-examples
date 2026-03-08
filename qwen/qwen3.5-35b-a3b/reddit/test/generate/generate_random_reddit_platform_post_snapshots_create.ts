import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_reddit_platform_post_snapshot } from "../prepare/prepare_random_reddit_platform_post_snapshot";

export async function generate_random_reddit_platform_post_snapshots_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditPlatformPostSnapshot.ICreate> | undefined;
  },
): Promise<IRedditPlatformPostSnapshot> {
  const prepared: IRedditPlatformPostSnapshot.ICreate =
    prepare_random_reddit_platform_post_snapshot(props.body);
  const result: IRedditPlatformPostSnapshot =
    await api.functional.redditPlatform.post_snapshots.create(connection, {
      body: prepared,
    });
  return result;
}
