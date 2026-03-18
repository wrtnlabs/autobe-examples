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

export async function test_api_timesheet_snapshot_detail_owner_audit_view(
  connection: api.IConnection,
): Promise<void> {
  const employeeConnection: api.IConnection = { host: connection.host };
  const employeeEmail = typia.random<string & tags.Format<"email">>();
  const employeePassword = RandomGenerator.alphaNumeric(16);
  const employeeAuth = await authorize_employee_join(employeeConnection, {
    body: {
      email: employeeEmail,
      password: employeePassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmTimeTrackingEmployee.IJoin,
  });
  typia.assert(employeeAuth);
  const now = new Date();
  const day = now.getUTCDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + diffToMonday,
      0,
      0,
      0,
      0,
    ),
  );
  const weekStartDate = monday.toISOString();
  const timesheet =
    await generate_random_hrm_time_tracking_employee_timesheets_create(
      employeeConnection,
      {
        body: {
          week_start_date: weekStartDate,
        } satisfies IHrmTimeTrackingTimesheet.ICreate,
      },
    );
  typia.assert(timesheet);
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_owner_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmTimeTrackingOwner.IJoin,
  });
  typia.assert(ownerAuth);
  const capturedLocked = RandomGenerator.pick([true, false] as const);
  const snapshot =
    await generate_random_hrm_time_tracking_owner_timesheets_snapshots_create(
      ownerConnection,
      {
        params: {
          timesheetId: timesheet.id,
        },
        body: {
          locked: capturedLocked,
        } satisfies IHrmTimeTrackingTimesheetSnapshot.ICreate,
      },
    );
  typia.assert(snapshot);
  const found =
    await api.functional.hrmTimeTracking.owner.timesheets.snapshots.at(
      ownerConnection,
      {
        timesheetId: timesheet.id,
        timesheetSnapshotId: snapshot.id,
      },
    );
  typia.assert(found);
  TestValidator.equals("snapshot id matches", found.id, snapshot.id);
  TestValidator.equals(
    "parent timesheet id matches",
    found.timesheet.id,
    timesheet.id,
  );
  TestValidator.equals("locked flag preserved", found.locked, capturedLocked);
  TestValidator.equals(
    "timesheet status unchanged",
    found.timesheet.status,
    timesheet.status,
  );
  TestValidator.equals(
    "timesheet submitted_at unchanged",
    found.timesheet.submitted_at,
    timesheet.submitted_at,
  );
  TestValidator.equals(
    "timesheet reviewed_at unchanged",
    found.timesheet.reviewed_at,
    timesheet.reviewed_at,
  );
  TestValidator.equals(
    "timesheet rejection_reason unchanged",
    found.timesheet.rejection_reason,
    timesheet.rejection_reason,
  );
}
