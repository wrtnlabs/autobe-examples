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

/**
 * Test the project summary endpoint for a project that exceeds its budget hours.
 *
 * Validates the budget utilization capping logic where utilization should not exceed
 * 100% even if hours logged exceed budget. This test creates a member account, sets up
 * a project with a small budget, logs timelogs exceeding that budget, and verifies the
 * summary endpoint correctly caps budget_utilization at 100 while accurately reporting
 * all other metrics.
 *
 * Special attention is given to verifying that the budget_utilization field is properly
 * capped at 100 rather than showing the raw calculated percentage when total hours
 * exceed the budget allocation.
 *
 * 1. Member registration via POST /hrmPlatform/auth/member/join
 * 2. Project creation with budget_hours via POST /hrmPlatform/member/projects
 * 3. Timelog creation exceeding budget via POST /hrmPlatform/member/timelogs
 * 4. Summary retrieval via GET /hrmPlatform/member/projects/{projectId}/summary
 * 5. Validation of budget utilization capping and all aggregations
 */
export async function test_api_project_summary_budget_utilization_capped(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member with initial organization
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePass123!",
      name: RandomGenerator.name(),
      org_name: RandomGenerator.name(),
      org_currency: "USD",
      org_timezone: "UTC",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create project with small budget
  const projectConnection: api.IConnection = { host: connection.host };
  projectConnection.headers = { Authorization: memberAuth.token.access };
  const budgetHours = 50;
  const project = await generate_random_hrm_platform_member_projects_create(
    projectConnection,
    {
      body: {
        name: RandomGenerator.name(),
        color_code: "#3498db",
        description: "Test project for budget utilization capping",
        budget_hours: budgetHours,
      } satisfies IHrmPlatformProject.ICreate,
    },
  );
  typia.assert(project);
  // 3. Create timelogs exceeding the budget (total 75 hours = 4500 minutes)
  const timelogConnection: api.IConnection = { host: connection.host };
  timelogConnection.headers = { Authorization: memberAuth.token.access };
  // Calculate duration for 3 timelogs totaling 75 hours
  const totalDurationMinutes = 75 * 60; // 75 hours in minutes
  const durationPerTimelog = Math.floor(totalDurationMinutes / 3); // 25 hours per timelog
  // Get employee ID from project membership
  const employeeId = project.memberships[0]?.employee.id;
  if (!employeeId) throw new Error("No employee found in project memberships");
  const now = new Date();
  const startTime = new Date(now.getTime() - 75 * 24 * 60 * 60 * 1000); // 75 days ago
  // Create 3 timelogs totaling 75 hours
  await ArrayUtil.asyncRepeat(3, async (index) => {
    const start = new Date(
      startTime.getTime() + index * 25 * 24 * 60 * 60 * 1000,
    );
    const end = new Date(start.getTime() + durationPerTimelog * 60 * 1000);
    await generate_random_hrm_platform_member_timelogs_create(
      timelogConnection,
      {
        body: {
          employee_id: employeeId,
          project_id: project.id,
          start_datetime: start.toISOString(),
          end_datetime: end.toISOString(),
          duration_minutes: durationPerTimelog,
          billable: index % 2 === 0, // Alternate billable/non-billable
          description: "Test timelog entry",
        } satisfies IHrmPlatformTimelog.ICreate,
      },
    );
  });
  // 4. Get project summary
  const summaryConnection: api.IConnection = { host: connection.host };
  summaryConnection.headers = { Authorization: memberAuth.token.access };
  const summary = await api.functional.hrmPlatform.member.projects.summary(
    summaryConnection,
    {
      projectId: project.id,
    },
  );
  typia.assert(summary);
  // 5. Validate budget utilization capping
  TestValidator.equals("budget_hours match", summary.budget_hours, budgetHours);
  TestValidator.equals(
    "total_hours match",
    summary.total_hours,
    totalDurationMinutes / 60,
  );
  TestValidator.equals(
    "budget_utilization capped at 100",
    summary.budget_utilization,
    100,
  );
  // 6. Validate all aggregations are accurate
  TestValidator.predicate(
    "billable + non_billable = total",
    summary.billable_hours + summary.non_billable_hours === summary.total_hours,
  );
  TestValidator.equals("timelog_count correct", summary.timelog_count, 3);
  TestValidator.equals("employee_count correct", summary.employee_count, 1);
  // 7. Verify project status is still active despite over budget
  TestValidator.equals("project still active", summary.status, "active");
}
