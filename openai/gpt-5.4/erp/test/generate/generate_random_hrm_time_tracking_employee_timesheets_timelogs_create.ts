import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import type { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import type { IHrmTimeTrackingTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimelog";
import type { IHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimesheet";
import type { IHrmTimeTrackingTimesheetTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimesheetTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_hrm_time_tracking_timesheet_timelog } from "../prepare/prepare_random_hrm_time_tracking_timesheet_timelog";

export async function generate_random_hrm_time_tracking_employee_timesheets_timelogs_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IHrmTimeTrackingTimesheetTimelog.ICreate> | undefined;
    params: {
      timesheetId: string;
    };
  },
): Promise<IHrmTimeTrackingTimesheet> {
  const prepared: IHrmTimeTrackingTimesheetTimelog.ICreate =
    prepare_random_hrm_time_tracking_timesheet_timelog(props.body);
  const result: IHrmTimeTrackingTimesheet =
    await api.functional.hrmTimeTracking.employee.timesheets.timelogs.create(
      connection,
      {
        body: prepared,
        timesheetId: props.params.timesheetId,
      },
    );
  return result;
}
