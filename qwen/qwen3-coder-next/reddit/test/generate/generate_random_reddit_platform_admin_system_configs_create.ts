import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformSystematicConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformSystematicConfig";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_reddit_platform_systematic_config } from "../prepare/prepare_random_reddit_platform_systematic_config";

export async function generate_random_reddit_platform_admin_system_configs_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditPlatformSystematicConfig.ICreate> | undefined;
  },
): Promise<IRedditPlatformSystematicConfig> {
  const prepared: IRedditPlatformSystematicConfig.ICreate =
    prepare_random_reddit_platform_systematic_config(props.body);
  return await api.functional.redditPlatform.admin.system_configs.create(
    connection,
    {
      body: prepared,
    },
  );
}
