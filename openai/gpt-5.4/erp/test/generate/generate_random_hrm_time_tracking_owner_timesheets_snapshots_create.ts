import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimesheet";
import type { IHrmTimeTrackingTimesheetSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimesheetSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_hrm_time_tracking_timesheet_snapshot } from "../prepare/prepare_random_hrm_time_tracking_timesheet_snapshot";

export async function generate_random_hrm_time_tracking_owner_timesheets_snapshots_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IHrmTimeTrackingTimesheetSnapshot.ICreate> | undefined;
    params: {
      timesheetId: string;
    };
  },
): Promise<IHrmTimeTrackingTimesheetSnapshot> {
  const prepared: IHrmTimeTrackingTimesheetSnapshot.ICreate =
    prepare_random_hrm_time_tracking_timesheet_snapshot(props.body);
  const result: IHrmTimeTrackingTimesheetSnapshot =
    await api.functional.hrmTimeTracking.owner.timesheets.snapshots.create(
      connection,
      {
        body: prepared,
        timesheetId: props.params.timesheetId,
      },
    );
  return result;
}
