import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemConfig";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_community_platform_system_config } from "../prepare/prepare_random_community_platform_system_config";

export async function generate_random_community_platform_admin_system_configs_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformSystemConfig.ICreate> | undefined;
  },
): Promise<ICommunityPlatformSystemConfig> {
  const prepared: ICommunityPlatformSystemConfig.ICreate =
    prepare_random_community_platform_system_config(props.body);
  const result: ICommunityPlatformSystemConfig =
    await api.functional.communityPlatform.admin.system.configs.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
