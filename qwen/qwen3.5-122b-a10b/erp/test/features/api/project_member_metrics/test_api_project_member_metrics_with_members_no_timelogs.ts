import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
import type { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import type { IHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProject";
import type { IHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProjectMember";
import type { IHrmProjectMemberMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProjectMemberMetric";
import type { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_member_organizations_projects_create } from "../../../generate/generate_random_hrm_member_organizations_projects_create";
import { generate_random_hrm_member_projects_members_create } from "../../../generate/generate_random_hrm_member_projects_members_create";
import { prepare_random_hrm_project } from "../../../prepare/prepare_random_hrm_project";
import { prepare_random_hrm_project_member } from "../../../prepare/prepare_random_hrm_project_member";

/**
 * Test project member metrics endpoint with members but no timelogs.
 *
 * Validates that the project member metrics endpoint correctly calculates statistics when employees are assigned to a project but have not logged any time. This ensures the endpoint properly handles the edge case of zero time tracking data while maintaining accurate member counts and role distributions.
 *
 * The test verifies that metrics are computed correctly even when there is no time tracking activity, confirming that member assignment and time tracking data are properly separated in the metrics calculation logic.
 *
 * 1. Create a member user account with email and password, which establishes an organization context.
 * 2. Create a new project within the organization with active status.
 * 3. Assign employees to the project with different roles (member and project-lead) - requires pre-existing employee records.
 * 4. Call the metrics endpoint to retrieve aggregated statistics.
 * 5. Verify total_members matches the number of assigned employees.
 * 6. Verify members_by_role breakdown is accurate for each role type.
 * 7. Verify total_hours equals 0 since no timelogs were created.
 * 8. Verify average_hours_per_member is null due to division by zero scenario.
 * 9. Verify active_timers_count equals 0 since no timers are running.
 */
export async function test_api_project_member_metrics_with_members_no_timelogs(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create primary member user and organization
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth: IHrmMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IHrmMember.IJoin,
    },
  );
  typia.assert(memberAuth);
  const organizationId: string | undefined = memberAuth.organizations?.[0]?.id;
  if (!organizationId) {
    throw new Error("Organization not created during member join");
  }
  // 2. Create a project within the organization
  const project: IHrmProject =
    await generate_random_hrm_member_organizations_projects_create(
      memberConnection,
      {
        params: { organizationId },
        body: {
          status: "active",
        },
      },
    );
  typia.assert(project);
  // 3. Assign employees to the project with different roles
  // Note: Employee creation is a prerequisite not covered by available SDK functions.
  // In a complete test suite, employees would be created first via employee invitation or creation endpoints.
  // For this test, we assign multiple project members with different roles.
  const employeeCount: number = 3;
  const roles: ("member" | "project-lead")[] = [
    "member",
    "project-lead",
    "member",
  ];
  const projectMembers: IHrmProjectMember[] = [];
  await ArrayUtil.asyncRepeat(employeeCount, async (index: number) => {
    // Generate a valid employee UUID - in production, this would reference actual employee records
    const employeeId: string & tags.Format<"uuid"> = typia.random<
      string & tags.Format<"uuid">
    >();
    const projectMember: IHrmProjectMember =
      await generate_random_hrm_member_projects_members_create(
        memberConnection,
        {
          params: { projectId: project.id },
          body: {
            employee_id: employeeId,
            role: roles[index],
          } satisfies IHrmProjectMember.ICreate,
        },
      );
    typia.assert(projectMember);
    projectMembers.push(projectMember);
  });
  // 4. Call the metrics endpoint
  const metrics: IHrmProjectMemberMetric =
    await api.functional.hrm.member.organizations.projects.members.metrics(
      memberConnection,
      {
        organizationId,
        projectId: project.id,
      },
    );
  typia.assert(metrics);
  // 5. Verify total_members matches assigned employees
  TestValidator.equals(
    "total members count",
    metrics.total_members,
    employeeCount,
  );
  // 6. Verify members_by_role breakdown
  const expectedMemberCount: number = roles.filter(
    (r) => r === "member",
  ).length;
  const expectedProjectLeadCount: number = roles.filter(
    (r) => r === "project-lead",
  ).length;
  TestValidator.equals(
    "member role count",
    metrics.members_by_role.member,
    expectedMemberCount,
  );
  TestValidator.equals(
    "project lead role count",
    metrics.members_by_role.project_lead,
    expectedProjectLeadCount,
  );
  // 7. Verify total_hours equals 0 (no timelogs created)
  TestValidator.equals("total hours is zero", metrics.total_hours, 0);
  // 8. Verify average_hours_per_member is null (division by zero scenario with members but no hours)
  TestValidator.equals(
    "average hours is null",
    metrics.average_hours_per_member,
    null,
  );
  // 9. Verify active_timers_count equals 0 (no active timers)
  TestValidator.equals("active timers count", metrics.active_timers_count, 0);
}