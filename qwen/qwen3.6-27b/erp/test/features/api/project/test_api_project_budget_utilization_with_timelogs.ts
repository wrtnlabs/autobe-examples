import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformProjectBudgetReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectBudgetReport";
import type { IHrmPlatformProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMembership";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import type { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_employees_create } from "../../../generate/generate_random_hrm_platform_member_employees_create";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_projects_memberships_create } from "../../../generate/generate_random_hrm_platform_member_projects_memberships_create";
import { generate_random_hrm_platform_member_timelogs_create } from "../../../generate/generate_random_hrm_platform_member_timelogs_create";
import { prepare_random_hrm_platform_employee } from "../../../prepare/prepare_random_hrm_platform_employee";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_project_membership } from "../../../prepare/prepare_random_hrm_platform_project_membership";
import { prepare_random_hrm_platform_timelog } from "../../../prepare/prepare_random_hrm_platform_timelog";

export async function test_api_project_budget_utilization_with_timelogs(
  connection: api.IConnection,
) {
  // 1. Join and authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Create project with 80 hours budget
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    { body: { budget: 80 } },
  );
  typia.assert(project);
  // 3. Assign member as project member
  const membership =
    await generate_random_hrm_platform_member_projects_memberships_create(
      memberConnection,
      { params: { projectId: project.id }, body: {} },
    );
  typia.assert(membership);
  // 4a. Create billable timelog: 180 minutes (3 hours)
  const billableBody = {
    projectId: project.id,
    date: new Date().toISOString(),
    durationMinutes: 180,
    workDescription: "Billable client work",
    billable: true,
  } satisfies IHrmPlatformTimelog.ICreate;
  const billableTimelog =
    await api.functional.hrmPlatform.member.timelogs.create(memberConnection, {
      body: billableBody,
    });
  typia.assert(billableTimelog);
  // 4b. Create non-billable timelog: 120 minutes (2 hours)
  const nonBillableBody = {
    projectId: project.id,
    date: new Date().toISOString(),
    durationMinutes: 120,
    workDescription: "Non-billable internal work",
    billable: false,
  } satisfies IHrmPlatformTimelog.ICreate;
  const nonBillableTimelog =
    await api.functional.hrmPlatform.member.timelogs.create(memberConnection, {
      body: nonBillableBody,
    });
  typia.assert(nonBillableTimelog);
  // 5. Retrieve budget utilization report
  const report =
    await api.functional.hrmPlatform.member.projects.reports.budget(
      memberConnection,
      { projectId: project.id },
    );
  typia.assert(report);
  // 6. Validate project details in report
  TestValidator.equals("report project id", report.id, project.id);
  TestValidator.equals("report project name", report.name, project.name);
  TestValidator.equals(
    "report color code",
    report.color_code,
    project.color_code,
  );
  TestValidator.equals("report budget", report.budget, 80);
  TestValidator.equals("report status is active", report.status, "active");
  // 7. Validate actual hours: (180 + 120) / 60 = 5 hours
  TestValidator.equals("actual hours equals 5", report.actual_hours, 5);
  // 8. Validate utilization percent: (5 / 80) * 100 = 6.25%
  TestValidator.equals(
    "utilization percent equals 6.25",
    Math.round(report.utilization_percent! * 100) / 100,
    6.25,
  );
  // 9. Validate employee breakdowns: exactly 1 entry with 5 hours, 2 timelogs
  TestValidator.equals(
    "employee breakdowns count",
    report.employee_breakdowns.length,
    1,
  );
  const empBreakdown = report.employee_breakdowns[0];
  TestValidator.equals("employee hours equals 5", empBreakdown.hours, 5);
  TestValidator.equals(
    "employee timelog count equals 2",
    empBreakdown.timelog_count,
    2,
  );
  // 10. Validate billable breakdowns: 2 entries (billable and non-billable)
  TestValidator.equals(
    "billable breakdowns count",
    report.billable_breakdowns.length,
    2,
  );
  const billableBreakdown = report.billable_breakdowns.find(
    (b) => b.billable === true,
  );
  const nonBillableBreakdown = report.billable_breakdowns.find(
    (b) => b.billable === false,
  );
  TestValidator.predicate(
    "billable breakdown exists",
    billableBreakdown !== undefined,
  );
  TestValidator.predicate(
    "non-billable breakdown exists",
    nonBillableBreakdown !== undefined,
  );
  TestValidator.equals(
    "billable total hours equals 3",
    billableBreakdown!.total_hours,
    3,
  );
  TestValidator.equals(
    "billable timelog count equals 1",
    billableBreakdown!.timelog_count,
    1,
  );
  TestValidator.equals(
    "non-billable total hours equals 2",
    nonBillableBreakdown!.total_hours,
    2,
  );
  TestValidator.equals(
    "non-billable timelog count equals 1",
    nonBillableBreakdown!.timelog_count,
    1,
  );
}
