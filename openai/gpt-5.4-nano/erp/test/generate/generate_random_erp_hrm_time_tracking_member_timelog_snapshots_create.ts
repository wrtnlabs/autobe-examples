import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeTrackingTimelogSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingTimelogSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_erp_hrm_time_tracking_timelog_snapshot } from "../prepare/prepare_random_erp_hrm_time_tracking_timelog_snapshot";

export async function generate_random_erp_hrm_time_tracking_member_timelog_snapshots_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IErpHrmTimeTrackingTimelogSnapshot.ICreate> | undefined;
  },
): Promise<IErpHrmTimeTrackingTimelogSnapshot> {
  const prepared: IErpHrmTimeTrackingTimelogSnapshot.ICreate =
    prepare_random_erp_hrm_time_tracking_timelog_snapshot(props.body);
  return await api.functional.erpHrmTimeTracking.member.timelogSnapshots.create(
    connection,
    {
      body: prepared,
    },
  );
}
