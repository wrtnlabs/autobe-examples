import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeTrackingActivityLogEntrySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingActivityLogEntrySnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_erp_hrm_time_tracking_activity_log_entry_snapshot } from "../prepare/prepare_random_erp_hrm_time_tracking_activity_log_entry_snapshot";

export async function generate_random_erp_hrm_time_tracking_member_activity_log_entry_snapshots_create(
  connection: api.IConnection,
  props: {
    body?:
      | DeepPartial<IErpHrmTimeTrackingActivityLogEntrySnapshot.ICreate>
      | undefined;
  },
): Promise<IErpHrmTimeTrackingActivityLogEntrySnapshot> {
  const prepared: IErpHrmTimeTrackingActivityLogEntrySnapshot.ICreate =
    prepare_random_erp_hrm_time_tracking_activity_log_entry_snapshot(
      props.body,
    );
  return await api.functional.erpHrmTimeTracking.member.activityLogEntrySnapshots.create(
    connection,
    {
      body: prepared,
    },
  );
}
