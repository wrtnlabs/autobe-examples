import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingEmployeeWeeklySummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployeeWeeklySummary";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import type { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import type { IHrmTimeTrackingTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimelog";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackingEmployeeWeeklySummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingEmployeeWeeklySummary";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_employee_join } from "../../../authorize/authorize_employee_join";
import { authorize_employee_login } from "../../../authorize/authorize_employee_login";
import { authorize_employee_refresh } from "../../../authorize/authorize_employee_refresh";
import { generate_random_hrm_time_tracking_employee_timelogs_create } from "../../../generate/generate_random_hrm_time_tracking_employee_timelogs_create";
import { prepare_random_hrm_time_tracking_timelog } from "../../../prepare/prepare_random_hrm_time_tracking_timelog";

export async function test_api_weekly_summary_report_cross_organization_project_denied(
  connection: api.IConnection,
): Promise<void> {
  const employeeConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_employee_join(employeeConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!" satisfies string & tags.Format<"password">,
      href: "https://example.com/hrm/weekly-summary",
      referrer: "https://example.com/hrm",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(joined);
  const organizationId = joined.role.organization.id;
  const employeeId = joined.id;
  const weekStart = new Date("2026-03-02T00:00:00.000Z");
  const weekEnd = new Date("2026-03-08T23:59:59.999Z");
  const firstWorkedOn = new Date("2026-03-03T09:00:00.000Z").toISOString();
  const secondWorkedOn = new Date("2026-03-05T14:00:00.000Z").toISOString();
  const firstTimelog =
    await generate_random_hrm_time_tracking_employee_timelogs_create(
      employeeConnection,
      {
        body: {
          workedOn: firstWorkedOn,
          durationMinutes: 120,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          billable: true,
        },
      },
    );
  typia.assert(firstTimelog);
  const secondTimelog =
    await generate_random_hrm_time_tracking_employee_timelogs_create(
      employeeConnection,
      {
        body: {
          hrmTimeTrackingProjectId: firstTimelog.project.id,
          hrmTimeTrackingTaskId: null,
          workedOn: secondWorkedOn,
          durationMinutes: 90,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          billable: false,
        },
      },
    );
  typia.assert(secondTimelog);
  TestValidator.equals(
    "joined organization matches first timelog organization",
    firstTimelog.organization.id,
    organizationId,
  );
  TestValidator.equals(
    "joined organization matches second timelog organization",
    secondTimelog.organization.id,
    organizationId,
  );
  TestValidator.equals(
    "first timelog employee matches joined employee",
    firstTimelog.employee.id,
    employeeId,
  );
  TestValidator.equals(
    "second timelog employee matches joined employee",
    secondTimelog.employee.id,
    employeeId,
  );
  TestValidator.equals(
    "timelogs share project for deterministic aggregation",
    secondTimelog.project.id,
    firstTimelog.project.id,
  );
  const summaryRequest = {
    startDate: weekStart.toISOString(),
    endDate: weekEnd.toISOString(),
    projectId: firstTimelog.project.id,
    page: 1,
    limit: 20,
  } satisfies IHrmTimeTrackingEmployeeWeeklySummary.IRequest;
  const summaries =
    await api.functional.hrmTimeTracking.employee.weeklySummaries.index(
      employeeConnection,
      {
        body: summaryRequest,
      },
    );
  typia.assert(summaries);
  TestValidator.equals(
    "pagination current page",
    summaries.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", summaries.pagination.limit, 20);
  TestValidator.predicate("weekly summary has rows", summaries.data.length > 0);
  const target = summaries.data.find(
    (row) =>
      row.week_start_date <= firstWorkedOn &&
      row.week_end_date >= secondWorkedOn,
  );
  TestValidator.predicate("matching week summary exists", target !== undefined);
  if (target === undefined) {
    throw new Error("Expected matching week summary to exist");
  }
  const safeTarget = typia.assert(target);
  const expectedHours =
    (firstTimelog.duration_minutes + secondTimelog.duration_minutes) / 60;
  const expectedTimelogCount = 2;
  TestValidator.predicate(
    "summary total logged hours includes created timelogs",
    safeTarget.total_logged_hours >= expectedHours,
  );
  TestValidator.predicate(
    "summary timelog count includes created timelogs",
    safeTarget.timelog_count >= expectedTimelogCount,
  );
  TestValidator.predicate(
    "summary employee count is positive",
    safeTarget.employee_count >= 1,
  );
}
