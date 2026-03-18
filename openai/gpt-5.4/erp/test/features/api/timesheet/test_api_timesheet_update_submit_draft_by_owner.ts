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
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_employee_join } from "../../../authorize/authorize_employee_join";
import { authorize_employee_login } from "../../../authorize/authorize_employee_login";
import { authorize_employee_refresh } from "../../../authorize/authorize_employee_refresh";
import { generate_random_hrm_time_tracking_employee_timesheets_create } from "../../../generate/generate_random_hrm_time_tracking_employee_timesheets_create";
import { prepare_random_hrm_time_tracking_timesheet } from "../../../prepare/prepare_random_hrm_time_tracking_timesheet";

export async function test_api_timesheet_update_submit_draft_by_owner(
  connection: api.IConnection,
): Promise<void> {
  const employeeConnection: api.IConnection = { host: connection.host };
  await authorize_employee_join(employeeConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: "https://example.com/hrm/timesheets",
      referrer: "https://example.com/hrm",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmTimeTrackingEmployee.IJoin,
  });
  const now: Date = new Date();
  const day: number = now.getUTCDay();
  const diffToMonday: number = day === 0 ? 6 : day - 1;
  const monday: Date = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() - diffToMonday - 7,
      0,
      0,
      0,
      0,
    ),
  );
  const weekStartDate: string = monday.toISOString();
  const created: IHrmTimeTrackingTimesheet =
    await generate_random_hrm_time_tracking_employee_timesheets_create(
      employeeConnection,
      {
        body: {
          week_start_date: weekStartDate,
        } satisfies IHrmTimeTrackingTimesheet.ICreate,
      },
    );
  typia.assert(created);
  const createdTotalHours: number = created.timelogs.reduce(
    (sum, timelog) => sum + timelog.duration_minutes / 60,
    0,
  );
  const createdTimelogIds: Array<string & tags.Format<"uuid">> =
    created.timelogs.map((timelog) => timelog.id);
  TestValidator.equals("created status is draft", created.status, "draft");
  TestValidator.equals(
    "created submitted_at is null",
    created.submitted_at,
    null,
  );
  TestValidator.equals(
    "created reviewed_at is null",
    created.reviewed_at,
    null,
  );
  TestValidator.equals(
    "created rejection_reason is null",
    created.rejection_reason,
    null,
  );
  TestValidator.equals(
    "created total_hours reflects included timelogs",
    created.total_hours,
    createdTotalHours,
  );
  const updated: IHrmTimeTrackingTimesheet =
    await api.functional.hrmTimeTracking.employee.timesheets.update(
      employeeConnection,
      {
        timesheetId: created.id,
        body: {
          status: "submitted",
          rejection_reason: null,
        } satisfies IHrmTimeTrackingTimesheet.IUpdate,
      },
    );
  typia.assert(updated);
  const updatedTotalHours: number = updated.timelogs.reduce(
    (sum, timelog) => sum + timelog.duration_minutes / 60,
    0,
  );
  const updatedTimelogIds: Array<string & tags.Format<"uuid">> =
    updated.timelogs.map((timelog) => timelog.id);
  TestValidator.equals("timesheet id unchanged", updated.id, created.id);
  TestValidator.equals(
    "employee ownership unchanged",
    updated.employee.id,
    created.employee.id,
  );
  TestValidator.equals(
    "organization unchanged",
    updated.organization.id,
    created.organization.id,
  );
  TestValidator.equals("created status before submit", created.status, "draft");
  TestValidator.equals(
    "updated status is submitted",
    updated.status,
    "submitted",
  );
  TestValidator.predicate(
    "submitted_at populated by server",
    updated.submitted_at !== null,
  );
  TestValidator.equals("reviewed_at remains null", updated.reviewed_at, null);
  TestValidator.equals(
    "rejection_reason remains null",
    updated.rejection_reason,
    null,
  );
  TestValidator.equals(
    "timelog count unchanged during submission",
    updated.timelogs.length,
    created.timelogs.length,
  );
  TestValidator.equals(
    "timelog composition unchanged during submission",
    updatedTimelogIds,
    createdTimelogIds,
  );
  TestValidator.equals(
    "updated total_hours still reflects included timelogs",
    updated.total_hours,
    updatedTotalHours,
  );
  TestValidator.equals(
    "total_hours unchanged during submission",
    updated.total_hours,
    created.total_hours,
  );
}
