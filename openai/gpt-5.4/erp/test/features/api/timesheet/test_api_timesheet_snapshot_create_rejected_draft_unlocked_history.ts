import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOwner";
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
import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";
import { generate_random_hrm_time_tracking_employee_timesheets_create } from "../../../generate/generate_random_hrm_time_tracking_employee_timesheets_create";
import { generate_random_hrm_time_tracking_owner_timesheets_snapshots_create } from "../../../generate/generate_random_hrm_time_tracking_owner_timesheets_snapshots_create";
import { prepare_random_hrm_time_tracking_timesheet } from "../../../prepare/prepare_random_hrm_time_tracking_timesheet";
import { prepare_random_hrm_time_tracking_timesheet_snapshot } from "../../../prepare/prepare_random_hrm_time_tracking_timesheet_snapshot";

export async function test_api_timesheet_snapshot_create_rejected_draft_unlocked_history(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const employeeConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_owner_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(ownerAuth);
  const employeeAuth = await authorize_employee_join(employeeConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(employeeAuth);
  const createdTimesheet =
    await generate_random_hrm_time_tracking_employee_timesheets_create(
      employeeConnection,
      {
        body: {
          week_start_date: new Date("2024-01-01T00:00:00.000Z").toISOString(),
        } satisfies IHrmTimeTrackingTimesheet.ICreate,
      },
    );
  typia.assert(createdTimesheet);
  TestValidator.equals(
    "created timesheet belongs to employee",
    createdTimesheet.employee.id,
    employeeAuth.id,
  );
  TestValidator.equals(
    "created timesheet starts as draft",
    createdTimesheet.status,
    "draft",
  );
  const submittedTimesheet =
    await api.functional.hrmTimeTracking.employee.timesheets.submit(
      employeeConnection,
      {
        timesheetId: createdTimesheet.id,
      },
    );
  typia.assert(submittedTimesheet);
  TestValidator.equals(
    "submitted timesheet keeps same id",
    submittedTimesheet.id,
    createdTimesheet.id,
  );
  TestValidator.notEquals(
    "submitted timesheet leaves initial draft status",
    submittedTimesheet.status,
    createdTimesheet.status,
  );
  const rejectedTimesheet =
    await api.functional.hrmTimeTracking.owner.timesheets.reject(
      ownerConnection,
      {
        timesheetId: createdTimesheet.id,
        body: {
          rejection_reason: null,
        } satisfies IHrmTimeTrackingTimesheet.IReject,
      },
    );
  typia.assert(rejectedTimesheet);
  TestValidator.equals(
    "rejected timesheet keeps same id",
    rejectedTimesheet.id,
    createdTimesheet.id,
  );
  TestValidator.equals(
    "rejected timesheet returns to draft",
    rejectedTimesheet.status,
    "draft",
  );
  TestValidator.equals(
    "rejected timesheet preserves submission history",
    rejectedTimesheet.submitted_at,
    submittedTimesheet.submitted_at,
  );
  TestValidator.predicate(
    "rejected timesheet has review timestamp",
    rejectedTimesheet.reviewed_at !== null,
  );
  const snapshot =
    await generate_random_hrm_time_tracking_owner_timesheets_snapshots_create(
      ownerConnection,
      {
        params: {
          timesheetId: rejectedTimesheet.id,
        },
        body: {
          locked: false,
        } satisfies IHrmTimeTrackingTimesheetSnapshot.ICreate,
      },
    );
  typia.assert(snapshot);
  TestValidator.equals(
    "snapshot links to parent timesheet",
    snapshot.timesheet.id,
    rejectedTimesheet.id,
  );
  TestValidator.equals(
    "snapshot stores unlocked historical state",
    snapshot.locked,
    false,
  );
  TestValidator.equals(
    "snapshot reflects returned draft workflow state",
    snapshot.timesheet.status,
    rejectedTimesheet.status,
  );
}
