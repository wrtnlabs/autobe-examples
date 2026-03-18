import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingManager";
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
import { authorize_manager_join } from "../../../authorize/authorize_manager_join";
import { authorize_manager_login } from "../../../authorize/authorize_manager_login";
import { authorize_manager_refresh } from "../../../authorize/authorize_manager_refresh";
import { generate_random_hrm_time_tracking_employee_timesheets_create } from "../../../generate/generate_random_hrm_time_tracking_employee_timesheets_create";
import { prepare_random_hrm_time_tracking_timesheet } from "../../../prepare/prepare_random_hrm_time_tracking_timesheet";

export async function test_api_timesheet_approval_submitted_success(
  connection: api.IConnection,
): Promise<void> {
  const employeeConnection: api.IConnection = { host: connection.host };
  const employeePassword = RandomGenerator.alphaNumeric(
    16,
  ) satisfies string as string;
  const employeeEmail = typia.random<string & tags.Format<"email">>();
  const employeeJoin = await authorize_employee_join(employeeConnection, {
    body: {
      email: employeeEmail,
      password: employeePassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmTimeTrackingEmployee.IJoin,
  });
  typia.assert(employeeJoin);
  const weekStartDate = new Date("2026-03-09T00:00:00.000Z").toISOString();
  const draft =
    await generate_random_hrm_time_tracking_employee_timesheets_create(
      employeeConnection,
      {
        body: {
          week_start_date: weekStartDate,
        } satisfies IHrmTimeTrackingTimesheet.ICreate,
      },
    );
  typia.assert(draft);
  const submitted =
    await api.functional.hrmTimeTracking.employee.timesheets.submit(
      employeeConnection,
      {
        timesheetId: draft.id,
      },
    );
  typia.assert(submitted);
  TestValidator.equals(
    "submitted timesheet id preserved",
    submitted.id,
    draft.id,
  );
  TestValidator.equals(
    "submitted status becomes submitted",
    submitted.status,
    "submitted",
  );
  const managerConnection: api.IConnection = { host: connection.host };
  const managerJoin = await authorize_manager_join(managerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmTimeTrackingManager.IJoin,
  });
  typia.assert(managerJoin);
  const approved =
    await api.functional.hrmTimeTracking.manager.timesheets.approve(
      managerConnection,
      {
        timesheetId: submitted.id,
      },
    );
  typia.assert(approved);
  const calculatedTotalHours =
    approved.timelogs.reduce(
      (sum, timelog) => sum + timelog.duration_minutes,
      0,
    ) / 60;
  TestValidator.equals(
    "approved timesheet id preserved",
    approved.id,
    submitted.id,
  );
  TestValidator.equals(
    "approved status becomes approved",
    approved.status,
    "approved",
  );
  TestValidator.equals(
    "employee preserved after approval",
    approved.employee,
    submitted.employee,
  );
  TestValidator.equals(
    "organization preserved after approval",
    approved.organization,
    submitted.organization,
  );
  TestValidator.equals(
    "week start preserved after approval",
    approved.week_start_date,
    submitted.week_start_date,
  );
  TestValidator.equals(
    "week end preserved after approval",
    approved.week_end_date,
    submitted.week_end_date,
  );
  TestValidator.equals(
    "timelogs preserved after approval",
    approved.timelogs,
    submitted.timelogs,
  );
  TestValidator.equals(
    "submitted_at preserved after approval",
    approved.submitted_at,
    submitted.submitted_at,
  );
  TestValidator.equals(
    "rejection reason remains null",
    approved.rejection_reason,
    null,
  );
  TestValidator.equals(
    "calculated total hours matches timelog durations",
    approved.total_hours,
    calculatedTotalHours,
  );
  TestValidator.equals(
    "reviewed_at is null before approval",
    submitted.reviewed_at,
    null,
  );
  TestValidator.predicate(
    "reviewed_at is set after approval",
    approved.reviewed_at !== null,
  );
  TestValidator.notEquals(
    "workflow status changes from submitted to approved",
    approved.status,
    submitted.status,
  );
}
