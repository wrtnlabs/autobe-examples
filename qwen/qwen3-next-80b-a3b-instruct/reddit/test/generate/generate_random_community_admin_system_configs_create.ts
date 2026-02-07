import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunitySystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunitySystemConfig";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_community_system_config } from "../prepare/prepare_random_community_system_config";

export async function generate_random_community_admin_system_configs_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunitySystemConfig.ICreate> | undefined;
  },
): Promise<ICommunitySystemConfig> {
  const prepared: ICommunitySystemConfig.ICreate =
    prepare_random_community_system_config(props.body);
  const result: ICommunitySystemConfig =
    await api.functional.community.admin.system_configs.create(connection, {
      body: prepared,
    });
  return result;
}
