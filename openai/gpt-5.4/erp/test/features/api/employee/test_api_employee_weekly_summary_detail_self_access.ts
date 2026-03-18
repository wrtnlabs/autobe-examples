import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingEmployeeWeeklySummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployeeWeeklySummary";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_employee_join } from "../../../authorize/authorize_employee_join";
import { authorize_employee_login } from "../../../authorize/authorize_employee_login";
import { authorize_employee_refresh } from "../../../authorize/authorize_employee_refresh";

export async function test_api_employee_weekly_summary_detail_self_access(
  connection: api.IConnection,
): Promise<void> {
  const employeeConnection: api.IConnection = { host: connection.host };
  const authorized: IHrmTimeTrackingEmployee.IAuthorized =
    await authorize_employee_join(employeeConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IHrmTimeTrackingEmployee.IJoin,
    });
  typia.assert(authorized);
  const employeeWeeklySummaryId = typia.random<string & tags.Format<"uuid">>();
  const readSummary =
    async (): Promise<IHrmTimeTrackingEmployeeWeeklySummary> =>
      await api.functional.hrmTimeTracking.employee.weeklySummaries.at(
        employeeConnection,
        {
          employeeWeeklySummaryId,
        },
      );
  let summary: IHrmTimeTrackingEmployeeWeeklySummary;
  try {
    summary = await readSummary();
  } catch (exp) {
    if (exp instanceof api.HttpError) {
      await TestValidator.httpError(
        "fresh employee without setup has no accessible weekly summary detail",
        [403, 404],
        async () => await readSummary(),
      );
      return;
    }
    throw exp;
  }
  typia.assert(summary);
  const repeated: IHrmTimeTrackingEmployeeWeeklySummary = await readSummary();
  typia.assert(repeated);
  TestValidator.equals(
    "summary id matches requested id",
    summary.id,
    employeeWeeklySummaryId,
  );
  TestValidator.equals("repeated read preserves id", repeated.id, summary.id);
  TestValidator.equals(
    "summary belongs to authenticated employee",
    summary.employee.id,
    authorized.id,
  );
  TestValidator.equals(
    "summary employee email matches authorized employee",
    summary.employee.email,
    authorized.email,
  );
  TestValidator.equals(
    "repeated read preserves employee id",
    repeated.employee.id,
    summary.employee.id,
  );
  TestValidator.equals(
    "repeated read preserves week start",
    repeated.week_start_date,
    summary.week_start_date,
  );
  TestValidator.equals(
    "repeated read preserves week end",
    repeated.week_end_date,
    summary.week_end_date,
  );
  TestValidator.equals(
    "repeated read preserves total logged minutes",
    repeated.total_minutes_logged,
    summary.total_minutes_logged,
  );
  TestValidator.equals(
    "repeated read preserves timesheet status",
    repeated.current_timesheet_status,
    summary.current_timesheet_status,
  );
  TestValidator.equals(
    "repeated read preserves timer state",
    repeated.active_timer_running,
    summary.active_timer_running,
  );
  TestValidator.equals(
    "repeated read preserves open task count",
    repeated.assigned_open_task_count,
    summary.assigned_open_task_count,
  );
  TestValidator.equals(
    "repeated read preserves in-progress task count",
    repeated.assigned_in_progress_task_count,
    summary.assigned_in_progress_task_count,
  );
  TestValidator.equals(
    "repeated read preserves created timestamp",
    repeated.created_at,
    summary.created_at,
  );
  TestValidator.equals(
    "repeated read preserves updated timestamp",
    repeated.updated_at,
    summary.updated_at,
  );
  TestValidator.equals(
    "repeated read preserves deleted timestamp",
    repeated.deleted_at,
    summary.deleted_at,
  );
  const start = new Date(summary.week_start_date);
  const end = new Date(summary.week_end_date);
  TestValidator.equals("week starts on monday", start.getUTCDay(), 1);
  TestValidator.equals("week ends on sunday", end.getUTCDay(), 0);
  TestValidator.equals(
    "week boundaries span one monday-to-sunday week",
    Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)),
    6,
  );
}
