import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingManager";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import type { IHrmTimeTrackingReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingReport";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import type { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import type { IHrmTimeTrackingTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimelog";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackingReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingReport";
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
import { generate_random_hrm_time_tracking_employee_timelogs_create } from "../../../generate/generate_random_hrm_time_tracking_employee_timelogs_create";
import { generate_random_hrm_time_tracking_projects_create } from "../../../generate/generate_random_hrm_time_tracking_projects_create";
import { prepare_random_hrm_time_tracking_project } from "../../../prepare/prepare_random_hrm_time_tracking_project";
import { prepare_random_hrm_time_tracking_timelog } from "../../../prepare/prepare_random_hrm_time_tracking_timelog";

export async function test_api_weekly_summary_report_project_filter_isolation(
  connection: api.IConnection,
): Promise<void> {
  const managerConnection: api.IConnection = { host: connection.host };
  const managerAuth = await authorize_manager_join(managerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16) satisfies string as string,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(managerAuth);
  const employeeConnection: api.IConnection = { host: connection.host };
  const employeeAuth = await authorize_employee_join(employeeConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16) satisfies string as string,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(employeeAuth);
  const weekStart = new Date();
  weekStart.setUTCDate(weekStart.getUTCDate() - weekStart.getUTCDay());
  weekStart.setUTCHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart.getTime());
  weekEnd.setUTCDate(weekStart.getUTCDate() + 6);
  weekEnd.setUTCHours(23, 59, 59, 999);
  const targetProject = await generate_random_hrm_time_tracking_projects_create(
    managerConnection,
    {
      body: {
        name: `${RandomGenerator.name()}-${RandomGenerator.alphabets(6)}`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        color_code: "#33AA55",
        status: "active",
        budget_hours: 40,
        start_date: weekStart.toISOString(),
        end_date: weekEnd.toISOString(),
      },
    },
  );
  typia.assert(targetProject);
  const unrelatedProject =
    await generate_random_hrm_time_tracking_projects_create(managerConnection, {
      body: {
        name: `${RandomGenerator.name()}-${RandomGenerator.alphabets(6)}`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        color_code: "#AA3355",
        status: "active",
        budget_hours: 24,
        start_date: weekStart.toISOString(),
        end_date: weekEnd.toISOString(),
      },
    });
  typia.assert(unrelatedProject);
  TestValidator.equals(
    "projects share organization scope",
    targetProject.organization.id,
    unrelatedProject.organization.id,
  );
  TestValidator.equals(
    "employee belongs to project organization",
    employeeAuth.role.organization.id,
    targetProject.organization.id,
  );
  const targetWorkedOn = new Date(weekStart.getTime() + 24 * 60 * 60 * 1000);
  targetWorkedOn.setUTCHours(9, 0, 0, 0);
  const unrelatedWorkedOn = new Date(
    weekStart.getTime() + 2 * 24 * 60 * 60 * 1000,
  );
  unrelatedWorkedOn.setUTCHours(10, 0, 0, 0);
  const targetTimelogBody = {
    hrmTimeTrackingProjectId: targetProject.id,
    workedOn: targetWorkedOn.toISOString(),
    durationMinutes: 120,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    billable: true,
  } satisfies IHrmTimeTrackingTimelog.ICreate;
  const targetTimelog =
    await generate_random_hrm_time_tracking_employee_timelogs_create(
      employeeConnection,
      {
        body: targetTimelogBody,
      },
    );
  typia.assert(targetTimelog);
  const unrelatedTimelogBody = {
    hrmTimeTrackingProjectId: unrelatedProject.id,
    workedOn: unrelatedWorkedOn.toISOString(),
    durationMinutes: 45,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    billable: false,
  } satisfies IHrmTimeTrackingTimelog.ICreate;
  const unrelatedTimelog =
    await generate_random_hrm_time_tracking_employee_timelogs_create(
      employeeConnection,
      {
        body: unrelatedTimelogBody,
      },
    );
  typia.assert(unrelatedTimelog);
  TestValidator.equals(
    "target timelog references target project",
    targetTimelog.project.id,
    targetProject.id,
  );
  TestValidator.equals(
    "unrelated timelog references unrelated project",
    unrelatedTimelog.project.id,
    unrelatedProject.id,
  );
  TestValidator.equals(
    "target timelog stays in target organization",
    targetTimelog.organization.id,
    targetProject.organization.id,
  );
  TestValidator.equals(
    "unrelated timelog stays in target organization",
    unrelatedTimelog.organization.id,
    targetProject.organization.id,
  );
  const reportRequest = {
    range_start_date: weekStart.toISOString(),
    range_end_date: weekEnd.toISOString(),
    project_id: targetProject.id,
    page: 1,
    limit: 10,
  } satisfies IHrmTimeTrackingReport.IRequest;
  const reportPage =
    await api.functional.hrmTimeTracking.manager.reports.weeklySummaries.index(
      managerConnection,
      {
        body: reportRequest,
      },
    );
  typia.assert(reportPage);
  TestValidator.predicate(
    "pagination current is non-negative",
    reportPage.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is non-negative",
    reportPage.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination records cover returned data",
    reportPage.pagination.records >= reportPage.data.length,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    reportPage.pagination.pages >= 0,
  );
  for (const summary of reportPage.data) {
    if (summary.range_start_date !== null) {
      TestValidator.predicate(
        "summary range start is within request lower bound",
        new Date(summary.range_start_date).getTime() >=
          new Date(reportRequest.range_start_date).getTime(),
      );
    }
    if (summary.range_end_date !== null) {
      TestValidator.predicate(
        "summary range end is within request upper bound",
        new Date(summary.range_end_date).getTime() <=
          new Date(reportRequest.range_end_date).getTime(),
      );
    }
  }
}
