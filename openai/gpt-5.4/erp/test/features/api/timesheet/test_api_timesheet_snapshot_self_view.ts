import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import type { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import type { IHrmTimeTrackingTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimelog";
import type { IHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimesheet";
import type { IHrmTimeTrackingTimesheetSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimesheetSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_employee_join } from "../../../authorize/authorize_employee_join";
import { authorize_employee_login } from "../../../authorize/authorize_employee_login";
import { authorize_employee_refresh } from "../../../authorize/authorize_employee_refresh";
import { generate_random_hrm_time_tracking_employee_timesheets_create } from "../../../generate/generate_random_hrm_time_tracking_employee_timesheets_create";
import { generate_random_hrm_time_tracking_employee_timesheets_snapshots_create } from "../../../generate/generate_random_hrm_time_tracking_employee_timesheets_snapshots_create";
import { prepare_random_hrm_time_tracking_timesheet } from "../../../prepare/prepare_random_hrm_time_tracking_timesheet";
import { prepare_random_hrm_time_tracking_timesheet_snapshot } from "../../../prepare/prepare_random_hrm_time_tracking_timesheet_snapshot";

export async function test_api_timesheet_snapshot_self_view(
  connection: api.IConnection,
): Promise<void> {
  const employeeConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_employee_join(employeeConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16) satisfies string as string &
        tags.Format<"password">,
      href: "https://example.com/hrm/timesheets" satisfies string as string &
        tags.Format<"uri">,
      referrer: "https://example.com/hrm" satisfies string as string &
        tags.Format<"uri">,
    } satisfies IHrmTimeTrackingEmployee.IJoin,
  });
  typia.assert(authorized);
  const timesheet =
    await generate_random_hrm_time_tracking_employee_timesheets_create(
      employeeConnection,
      {
        body: {
          week_start_date: "2026-03-09T00:00:00.000Z",
        },
      },
    );
  typia.assert(timesheet);
  const snapshotInput = {
    locked: true,
  } satisfies IHrmTimeTrackingTimesheetSnapshot.ICreate;
  const createdSnapshot =
    await generate_random_hrm_time_tracking_employee_timesheets_snapshots_create(
      employeeConnection,
      {
        params: {
          timesheetId: timesheet.id,
        },
        body: snapshotInput,
      },
    );
  typia.assert(createdSnapshot);
  const snapshot =
    await api.functional.hrmTimeTracking.employee.timesheets.snapshots.at(
      employeeConnection,
      {
        timesheetId: timesheet.id,
        timesheetSnapshotId: createdSnapshot.id,
      },
    );
  typia.assert(snapshot);
  TestValidator.equals("snapshot id matches", snapshot.id, createdSnapshot.id);
  TestValidator.equals(
    "snapshot locked preserved",
    snapshot.locked,
    snapshotInput.locked,
  );
  TestValidator.equals(
    "parent timesheet id matches route",
    snapshot.timesheet.id,
    timesheet.id,
  );
  TestValidator.equals(
    "parent organization scoped",
    snapshot.timesheet.organization.id,
    timesheet.organization.id,
  );
  TestValidator.equals(
    "parent employee matches owner",
    snapshot.timesheet.employee.id,
    timesheet.employee.id,
  );
  TestValidator.equals(
    "week start preserved in summary",
    snapshot.timesheet.week_start_date,
    timesheet.week_start_date,
  );
  TestValidator.equals(
    "week end preserved in summary",
    snapshot.timesheet.week_end_date,
    timesheet.week_end_date,
  );
  TestValidator.equals(
    "created snapshot parent summary id consistent",
    createdSnapshot.timesheet.id,
    timesheet.id,
  );
  TestValidator.equals(
    "created snapshot organization consistent",
    createdSnapshot.timesheet.organization.id,
    timesheet.organization.id,
  );
}
