import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeTrackingActivityLogEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingActivityLogEntry";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_erp_hrm_time_tracking_activity_log_entry } from "../prepare/prepare_random_erp_hrm_time_tracking_activity_log_entry";

export async function generate_random_erp_hrm_time_tracking_member_activity_log_entries_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IErpHrmTimeTrackingActivityLogEntry.ICreate> | undefined;
  },
): Promise<IErpHrmTimeTrackingActivityLogEntry> {
  const prepared: IErpHrmTimeTrackingActivityLogEntry.ICreate =
    prepare_random_erp_hrm_time_tracking_activity_log_entry(props.body);
  return await api.functional.erpHrmTimeTracking.member.activityLogEntries.create(
    connection,
    {
      body: prepared,
    },
  );
}
