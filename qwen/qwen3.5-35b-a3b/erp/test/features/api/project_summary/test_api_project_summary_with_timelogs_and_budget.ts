import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberEmailVerification";
import type { IHrmPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberPasswordReset";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMembership";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import type { IHrmPlatformTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_timelogs_create } from "../../../generate/generate_random_hrm_platform_member_timelogs_create";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_timelog } from "../../../prepare/prepare_random_hrm_platform_timelog";

export async function test_api_project_summary_with_timelogs_and_budget(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account with initial organization
  const joinConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      org_description: RandomGenerator.paragraph(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // 2. Create project with budget and timeline
  const memberConnection: api.IConnection = { host: connection.host };
  const project = await api.functional.hrmPlatform.member.projects.create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        color_code: `#${RandomGenerator.alphabets(6)}`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        budget_hours: 100,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      } satisfies IHrmPlatformProject.ICreate,
    },
  );
  typia.assert(project);
  // 3. Create timelogs with billable and non-billable hours
  const employeeId = memberAuth.member.id;
  const projectId = project.id;
  const baseDate = new Date();
  // Create 3 billable timelogs
  const billableTimelogs: IHrmPlatformTimelog[] = [];
  for (let i = 0; i < 3; i++) {
    const start = new Date(baseDate.getTime() - (3 - i) * 24 * 60 * 60 * 1000);
    const end = new Date(start.getTime() + (2 + i) * 60 * 60 * 1000);
    const durationMinutes = (2 + i) * 60;
    const timelog = await api.functional.hrmPlatform.member.timelogs.create(
      memberConnection,
      {
        body: {
          employee_id: employeeId,
          project_id: projectId,
          start_datetime: start.toISOString(),
          end_datetime: end.toISOString(),
          duration_minutes: durationMinutes,
          description: `Billable work session ${i + 1}`,
          billable: true,
        } satisfies IHrmPlatformTimelog.ICreate,
      },
    );
    typia.assert(timelog);
    billableTimelogs.push(timelog);
  }
  // Create 2 non-billable timelogs
  const nonBillableTimelogs: IHrmPlatformTimelog[] = [];
  for (let i = 0; i < 2; i++) {
    const start = new Date(baseDate.getTime() - (6 + i) * 24 * 60 * 60 * 1000);
    const end = new Date(start.getTime() + 3 * 60 * 60 * 1000);
    const durationMinutes = 3 * 60;
    const timelog = await api.functional.hrmPlatform.member.timelogs.create(
      memberConnection,
      {
        body: {
          employee_id: employeeId,
          project_id: projectId,
          start_datetime: start.toISOString(),
          end_datetime: end.toISOString(),
          duration_minutes: durationMinutes,
          description: `Non-billable work session ${i + 1}`,
          billable: false,
        } satisfies IHrmPlatformTimelog.ICreate,
      },
    );
    typia.assert(timelog);
    nonBillableTimelogs.push(timelog);
  }
  // 4. Get project summary
  const summary = await api.functional.hrmPlatform.member.projects.summary(
    memberConnection,
    { projectId },
  );
  typia.assert(summary);
  // 5. Validate project attributes
  TestValidator.equals("project id", summary.id, project.id);
  TestValidator.equals("project name", summary.name, project.name);
  TestValidator.equals("status", summary.status, project.status);
  TestValidator.equals("color_code", summary.color_code, project.color_code);
  TestValidator.equals(
    "budget_hours",
    summary.budget_hours,
    project.budget_hours,
  );
  TestValidator.equals("description", summary.description, project.description);
  // 6. Calculate expected aggregated values
  const totalBillableMinutes = billableTimelogs.reduce(
    (sum, t) => sum + t.duration_minutes,
    0,
  );
  const totalNonBillableMinutes = nonBillableTimelogs.reduce(
    (sum, t) => sum + t.duration_minutes,
    0,
  );
  const totalMinutes = totalBillableMinutes + totalNonBillableMinutes;
  const totalHours = totalMinutes / 60;
  const billableHours = totalBillableMinutes / 60;
  const nonBillableHours = totalNonBillableMinutes / 60;
  const timelogCount = billableTimelogs.length + nonBillableTimelogs.length;
  const employeeCount = 1;
  // 7. Validate aggregated timelog statistics
  TestValidator.equals("total_hours", summary.total_hours, totalHours);
  TestValidator.equals("billable_hours", summary.billable_hours, billableHours);
  TestValidator.equals(
    "non_billable_hours",
    summary.non_billable_hours,
    nonBillableHours,
  );
  TestValidator.equals("timelog_count", summary.timelog_count, timelogCount);
  TestValidator.equals("employee_count", summary.employee_count, employeeCount);
  // 8. Validate budget utilization (capped at 100%)
  let expectedUtilization: number | null = null;
  if (project.budget_hours !== null && project.budget_hours !== undefined) {
    expectedUtilization = Math.min(
      (totalHours / project.budget_hours) * 100,
      100,
    );
  }
  TestValidator.equals(
    "budget_utilization",
    summary.budget_utilization,
    expectedUtilization,
  );
  // 9. Validate billable + non_billable equals total
  TestValidator.equals(
    "billable + non_billable = total",
    summary.billable_hours + summary.non_billable_hours,
    summary.total_hours,
  );
  // 10. Validate timestamps
  TestValidator.predicate(
    "created_at is valid date-time",
    () => !Number.isNaN(Date.parse(summary.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    () => !Number.isNaN(Date.parse(summary.updated_at)),
  );
}
