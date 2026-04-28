import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformHighUtilizationProjectSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformHighUtilizationProjectSummary";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationDashboard";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
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

export async function test_api_organization_dashboard_week_boundary_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: undefined,
  });
  // Step 2: Get current week boundaries (Monday to Sunday)
  const now = new Date();
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const sundayOffset = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
  const currentWeekStart = new Date(now);
  currentWeekStart.setDate(now.getDate() + mondayOffset);
  currentWeekStart.setHours(0, 0, 0, 0);
  const currentWeekEnd = new Date(now);
  currentWeekEnd.setDate(now.getDate() + sundayOffset);
  // Step 3: Create employees
  const employee1: IHrmPlatformEmployee =
    await generate_random_hrm_platform_member_employees_create(
      memberConnection,
      {
        body: undefined,
      },
    );
  typia.assert(employee1);
  const employee2: IHrmPlatformEmployee =
    await generate_random_hrm_platform_member_employees_create(
      memberConnection,
      {
        body: undefined,
      },
    );
  typia.assert(employee2);
  // Step 4: Create project
  const project: IHrmPlatformProject =
    await generate_random_hrm_platform_member_projects_create(
      memberConnection,
      {
        body: undefined,
      },
    );
  typia.assert(project);
  // Step 5: Assign employees to project
  const membership1: IHrmPlatformProjectMembership =
    await generate_random_hrm_platform_member_projects_memberships_create(
      memberConnection,
      {
        body: undefined,
        params: {
          projectId: project.id,
        },
      },
    );
  typia.assert(membership1);
  const membership2: IHrmPlatformProjectMembership =
    await generate_random_hrm_platform_member_projects_memberships_create(
      memberConnection,
      {
        body: undefined,
        params: {
          projectId: project.id,
        },
      },
    );
  typia.assert(membership2);
  // Step 6: Create timelogs within the current week
  const currentWeekTimelog1: IHrmPlatformTimelog =
    await generate_random_hrm_platform_member_timelogs_create(
      memberConnection,
      {
        body: {
          projectId: project.id,
          date: currentWeekStart.toISOString(),
          durationMinutes: 480,
          billable: true,
        },
      },
    );
  typia.assert(currentWeekTimelog1);
  const currentWeekTimelog2: IHrmPlatformTimelog =
    await generate_random_hrm_platform_member_timelogs_create(
      memberConnection,
      {
        body: {
          projectId: project.id,
          date: currentWeekEnd.toISOString(),
          durationMinutes: 360,
          billable: true,
        },
      },
    );
  typia.assert(currentWeekTimelog2);
  // Step 7: Create timelogs outside the current week (previous week)
  const previousWeekStart = new Date(currentWeekStart);
  previousWeekStart.setDate(currentWeekStart.getDate() - 7);
  const previousWeekTimelog: IHrmPlatformTimelog =
    await generate_random_hrm_platform_member_timelogs_create(
      memberConnection,
      {
        body: {
          projectId: project.id,
          date: previousWeekStart.toISOString(),
          durationMinutes: 600,
          billable: true,
        },
      },
    );
  typia.assert(previousWeekTimelog);
  // Step 8: Retrieve organization dashboard
  const dashboard: IHrmPlatformOrganizationDashboard =
    await api.functional.hrmPlatform.member.organization_dashboard.at(
      memberConnection,
    );
  typia.assert(dashboard);
  // Step 9: Verify totalHoursThisWeek contains only current week timelogs
  const expectedCurrentWeekMinutes =
    currentWeekTimelog1.duration_minutes + currentWeekTimelog2.duration_minutes;
  const expectedCurrentWeekHours = expectedCurrentWeekMinutes / 60;
  TestValidator.predicate(
    "totalHoursThisWeek only includes current week timelogs",
    Math.abs(dashboard.totalHoursThisWeek - expectedCurrentWeekHours) < 0.01,
  );
  // Step 10: Verify topEmployeesByHours includes employees with current week timelogs
  TestValidator.predicate(
    "employees with current week timelogs appear in top employees",
    dashboard.topEmployeesByHours.some((emp) => emp.id === employee1.id),
  );
  // Step 11: Verify previous week timelogs are excluded from totalHoursThisWeek
  const previousWeekHours = previousWeekTimelog.duration_minutes / 60;
  TestValidator.predicate(
    "previous week hours not included in total",
    Math.abs(dashboard.totalHoursThisWeek - expectedCurrentWeekHours) < 0.01 &&
      Math.abs(
        dashboard.totalHoursThisWeek -
          (expectedCurrentWeekHours + previousWeekHours),
      ) >=
        previousWeekHours / 2,
  );
}
