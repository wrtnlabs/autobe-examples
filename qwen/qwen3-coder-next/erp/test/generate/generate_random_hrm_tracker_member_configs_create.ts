import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTrackerSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerSystemConfig";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_hrm_tracker_system_config } from "../prepare/prepare_random_hrm_tracker_system_config";

export async function generate_random_hrm_tracker_member_configs_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IHrmTrackerSystemConfig.ICreate> | undefined;
  },
): Promise<IHrmTrackerSystemConfig> {
  const prepared: IHrmTrackerSystemConfig.ICreate =
    prepare_random_hrm_tracker_system_config(props.body);
  return await api.functional.hrmTracker.member.configs.create(connection, {
    body: prepared,
  });
}
