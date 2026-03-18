import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationDashboard";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformProjectBudgetAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectBudgetAnalytic";
import type { IHrmPlatformProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMember";
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
import { generate_random_hrm_platform_member_organizations_create } from "../../../generate/generate_random_hrm_platform_member_organizations_create";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_projects_members_create } from "../../../generate/generate_random_hrm_platform_member_projects_members_create";
import { generate_random_hrm_platform_member_timelogs_create } from "../../../generate/generate_random_hrm_platform_member_timelogs_create";
import { generate_random_hrm_platform_member_timesheets_create } from "../../../generate/generate_random_hrm_platform_member_timesheets_create";
import { prepare_random_hrm_platform_employee } from "../../../prepare/prepare_random_hrm_platform_employee";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_project_member } from "../../../prepare/prepare_random_hrm_platform_project_member";
import { prepare_random_hrm_platform_timelog } from "../../../prepare/prepare_random_hrm_platform_timelog";
import { prepare_random_hrm_platform_timesheet } from "../../../prepare/prepare_random_hrm_platform_timesheet";

export async function test_api_organization_dashboard_data_isolation_between_organizations(
  connection: api.IConnection,
): Promise<void> {
  // ========================================================================
  // PHASE 1: Setup Organization A with Member A
  // ========================================================================
  // 1.1 Join Member A
  const memberAAuth = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAAuth);
  // 1.2 Create Organization A connection
  const organizationAConnection: api.IConnection = { host: connection.host };
  organizationAConnection.headers = { Authorization: memberAAuth.token.access };
  // 1.3 Create Organization A
  const organizationA =
    await generate_random_hrm_platform_member_organizations_create(
      organizationAConnection,
      {
        body: {
          name: `Organization A - ${RandomGenerator.name()}`,
          currency: "USD",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
        },
      },
    );
  typia.assert(organizationA);
  // 1.4 Create employees in Organization A (3 employees)
  const employeeA1 = await generate_random_hrm_platform_member_employees_create(
    organizationAConnection,
    {
      body: {
        member_id: memberAAuth.id,
        employment_type: "full-time",
      },
    },
  );
  typia.assert(employeeA1);
  // Create additional employees for Organization A
  const memberA2Auth = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberA2Auth);
  const employeeA2 = await generate_random_hrm_platform_member_employees_create(
    organizationAConnection,
    {
      body: {
        member_id: memberA2Auth.id,
        employment_type: "full-time",
      },
    },
  );
  typia.assert(employeeA2);
  const memberA3Auth = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberA3Auth);
  const employeeA3 = await generate_random_hrm_platform_member_employees_create(
    organizationAConnection,
    {
      body: {
        member_id: memberA3Auth.id,
        employment_type: "part-time",
      },
    },
  );
  typia.assert(employeeA3);
  // 1.5 Create projects in Organization A
  const projectA = await generate_random_hrm_platform_member_projects_create(
    organizationAConnection,
    {
      body: {
        name: `Project A - ${RandomGenerator.name()}`,
        color_code: "#FF5733",
        status: "active",
      },
    },
  );
  typia.assert(projectA);
  // 1.6 Assign employees to Project A
  await generate_random_hrm_platform_member_projects_members_create(
    organizationAConnection,
    {
      params: { projectId: projectA.id },
      body: {
        hrm_platform_employee_id: employeeA1.id,
        role: "project-lead",
      },
    },
  );
  await generate_random_hrm_platform_member_projects_members_create(
    organizationAConnection,
    {
      params: { projectId: projectA.id },
      body: {
        hrm_platform_employee_id: employeeA2.id,
        role: "member",
      },
    },
  );
  // 1.7 Create timelogs in Organization A (for current week)
  const currentDate = new Date();
  const timelogDateA = new Date(currentDate);
  timelogDateA.setDate(currentDate.getDate() - 1); // Yesterday
  const timelogA1 = await generate_random_hrm_platform_member_timelogs_create(
    organizationAConnection,
    {
      body: {
        project_id: projectA.id,
        date: timelogDateA.toISOString(),
        duration_minutes: 480, // 8 hours
        description: "Work on Project A",
        billable: true,
      },
    },
  );
  typia.assert(timelogA1);
  const timelogA2 = await generate_random_hrm_platform_member_timelogs_create(
    organizationAConnection,
    {
      body: {
        project_id: projectA.id,
        date: timelogDateA.toISOString(),
        duration_minutes: 360, // 6 hours
        description: "Work on Project A - Employee 2",
        billable: true,
      },
    },
  );
  typia.assert(timelogA2);
  // 1.8 Create submitted timesheet in Organization A
  const weekStartDate = new Date(currentDate);
  weekStartDate.setDate(currentDate.getDate() - currentDate.getDay() + 1); // Monday
  weekStartDate.setHours(0, 0, 0, 0);
  const timesheetA =
    await generate_random_hrm_platform_member_timesheets_create(
      organizationAConnection,
      {
        body: {
          week_start_date: weekStartDate.toISOString(),
        },
      },
    );
  typia.assert(timesheetA);
  // ========================================================================
  // PHASE 2: Setup Organization B with Member B (for isolation testing)
  // ========================================================================
  // 2.1 Join Member B
  const memberBAuth = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberBAuth);
  // 2.2 Create Organization B connection
  const organizationBConnection: api.IConnection = { host: connection.host };
  organizationBConnection.headers = { Authorization: memberBAuth.token.access };
  // 2.3 Create Organization B
  const organizationB =
    await generate_random_hrm_platform_member_organizations_create(
      organizationBConnection,
      {
        body: {
          name: `Organization B - ${RandomGenerator.name()}`,
          currency: "EUR",
          timezone: "Europe/Berlin",
          fiscal_start_month: 4,
        },
      },
    );
  typia.assert(organizationB);
  // 2.4 Create employees in Organization B (2 employees - different count than Org A)
  const employeeB1 = await generate_random_hrm_platform_member_employees_create(
    organizationBConnection,
    {
      body: {
        member_id: memberBAuth.id,
        employment_type: "full-time",
      },
    },
  );
  typia.assert(employeeB1);
  const memberB2Auth = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberB2Auth);
  const employeeB2 = await generate_random_hrm_platform_member_employees_create(
    organizationBConnection,
    {
      body: {
        member_id: memberB2Auth.id,
        employment_type: "contractor",
      },
    },
  );
  typia.assert(employeeB2);
  // 2.5 Create projects in Organization B
  const projectB = await generate_random_hrm_platform_member_projects_create(
    organizationBConnection,
    {
      body: {
        name: `Project B - ${RandomGenerator.name()}`,
        color_code: "#33FF57",
        status: "active",
      },
    },
  );
  typia.assert(projectB);
  // 2.6 Assign employees to Project B
  await generate_random_hrm_platform_member_projects_members_create(
    organizationBConnection,
    {
      params: { projectId: projectB.id },
      body: {
        hrm_platform_employee_id: employeeB1.id,
        role: "project-lead",
      },
    },
  );
  // 2.7 Create timelogs in Organization B (should NOT appear in Org A dashboard)
  const timelogDateB = new Date(currentDate);
  timelogDateB.setDate(currentDate.getDate() - 1); // Same date as Org A timelogs
  const timelogB1 = await generate_random_hrm_platform_member_timelogs_create(
    organizationBConnection,
    {
      body: {
        project_id: projectB.id,
        date: timelogDateB.toISOString(),
        duration_minutes: 600, // 10 hours - should not affect Org A dashboard
        description: "Work on Project B",
        billable: true,
      },
    },
  );
  typia.assert(timelogB1);
  const timelogB2 = await generate_random_hrm_platform_member_timelogs_create(
    organizationBConnection,
    {
      body: {
        project_id: projectB.id,
        date: timelogDateB.toISOString(),
        duration_minutes: 420, // 7 hours - should not affect Org A dashboard
        description: "Work on Project B - Employee 2",
        billable: true,
      },
    },
  );
  typia.assert(timelogB2);
  // ========================================================================
  // PHASE 3: Re-authenticate as Member A and validate dashboard isolation
  // ========================================================================
  // 3.1 Re-login as Member A to restore Organization A session context
  const memberALoginAuth = await authorize_member_login(connection, {
    body: {
      email: memberAAuth.email,
      password: "TestPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberALoginAuth);
  // 3.2 Create fresh connection for Member A
  const memberAConnection: api.IConnection = { host: connection.host };
  memberAConnection.headers = { Authorization: memberALoginAuth.token.access };
  // 3.3 Call organization dashboard endpoint
  const dashboard =
    await api.functional.hrmPlatform.member.dashboard.organization.at(
      memberAConnection,
      {
        body: {},
      },
    );
  typia.assert(dashboard);
  // ========================================================================
  // PHASE 4: Validate data isolation - Dashboard should ONLY show Org A data
  // ========================================================================
  // 4.1 Validate totalActiveEmployees - should be 3 (Org A employees only, not Org B's 2)
  TestValidator.predicate(
    "totalActiveEmployees should only include Organization A employees (3, not 5 total)",
    () => dashboard.totalActiveEmployees === 3,
  );
  // 4.2 Validate totalHoursThisWeek - should only include Org A timelogs (14 hours = 840 minutes)
  // Org A: 480 + 360 = 840 minutes = 14 hours
  // Org B: 600 + 420 = 1020 minutes (should NOT be included)
  TestValidator.predicate(
    "totalHoursThisWeek should only include Organization A timelogs (14 hours, not 25 total)",
    () => {
      const expectedHoursOrgA = (480 + 360) / 60; // 14 hours
      return Math.abs(dashboard.totalHoursThisWeek - expectedHoursOrgA) < 0.1;
    },
  );
  // 4.3 Validate topEmployeesByHours - should only contain Org A employees
  TestValidator.predicate(
    "topEmployeesByHours should only contain Organization A employees",
    () => {
      const orgAEmployeeIds = [employeeA1.id, employeeA2.id, employeeA3.id];
      return dashboard.topEmployeesByHours.every((emp) =>
        orgAEmployeeIds.includes(emp.employeeId),
      );
    },
  );
  // 4.4 Validate topEmployeesByHours count - should not exceed Org A employee count
  TestValidator.predicate(
    "topEmployeesByHours should have at most 3 employees (Org A count)",
    () => dashboard.topEmployeesByHours.length <= 3,
  );
  // 4.5 Validate no Org B employee IDs appear in dashboard
  TestValidator.predicate(
    "topEmployeesByHours should NOT contain Organization B employee IDs",
    () => {
      const orgBEmployeeIds = [employeeB1.id, employeeB2.id];
      return dashboard.topEmployeesByHours.every(
        (emp) => !orgBEmployeeIds.includes(emp.employeeId),
      );
    },
  );
  // 4.6 Validate employee names in topEmployeesByHours match Org A employees
  TestValidator.predicate(
    "topEmployeesByHours employee names should match Organization A employees",
    () => {
      const orgAEmployeeNames = [
        employeeA1.display_name,
        employeeA2.display_name,
        employeeA3.display_name,
      ];
      return dashboard.topEmployeesByHours.every((emp) =>
        orgAEmployeeNames.includes(emp.name),
      );
    },
  );
}
