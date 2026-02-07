import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityMaintenanceConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMaintenanceConfig";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_community_maintenance_config } from "../prepare/prepare_random_community_maintenance_config";

export async function generate_random_community_admin_maintenance_configs_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityMaintenanceConfig.ICreate>;
  },
): Promise<ICommunityMaintenanceConfig> {
  const prepared: ICommunityMaintenanceConfig.ICreate =
    prepare_random_community_maintenance_config(props.body);
  const result: ICommunityMaintenanceConfig =
    await api.functional.community.admin.maintenance_configs.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
