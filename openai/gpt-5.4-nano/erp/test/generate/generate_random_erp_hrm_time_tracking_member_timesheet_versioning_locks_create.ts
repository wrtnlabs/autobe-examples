import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeTrackingTimesheetVersioningLock } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingTimesheetVersioningLock";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_erp_hrm_time_tracking_timesheet_versioning_lock } from "../prepare/prepare_random_erp_hrm_time_tracking_timesheet_versioning_lock";

export async function generate_random_erp_hrm_time_tracking_member_timesheet_versioning_locks_create(
  connection: api.IConnection,
  props: {
    body?:
      | DeepPartial<IErpHrmTimeTrackingTimesheetVersioningLock.ICreate>
      | undefined;
  },
): Promise<IErpHrmTimeTrackingTimesheetVersioningLock> {
  const prepared: IErpHrmTimeTrackingTimesheetVersioningLock.ICreate =
    prepare_random_erp_hrm_time_tracking_timesheet_versioning_lock(props.body);
  return await api.functional.erpHrmTimeTracking.member.timesheetVersioningLocks.create(
    connection,
    {
      body: prepared,
    },
  );
}
