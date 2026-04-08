import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmInvitation";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmOrganizationContext } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationContext";
import type { IErpHrmOrganizationDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationDashboard";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import type { IErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheet";
import type { IErpHrmTimesheetTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheetTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_admin_employees_create } from "../../../generate/generate_random_erp_hrm_admin_employees_create";
import { generate_random_erp_hrm_admin_projects_create } from "../../../generate/generate_random_erp_hrm_admin_projects_create";
import { generate_random_erp_hrm_member_organization_context_select } from "../../../generate/generate_random_erp_hrm_member_organization_context_select";
import { generate_random_erp_hrm_member_timelogs_create } from "../../../generate/generate_random_erp_hrm_member_timelogs_create";
import { generate_random_erp_hrm_member_timesheets_create } from "../../../generate/generate_random_erp_hrm_member_timesheets_create";
import { prepare_random_erp_hrm_employee } from "../../../prepare/prepare_random_erp_hrm_employee";
import { prepare_random_erp_hrm_organization_context } from "../../../prepare/prepare_random_erp_hrm_organization_context";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_timelog } from "../../../prepare/prepare_random_erp_hrm_timelog";
import { prepare_random_erp_hrm_timesheet } from "../../../prepare/prepare_random_erp_hrm_timesheet";

export async function test_api_organization_dashboard_retrieval_with_metrics(
  connection: api.IConnection,
): Promise<void> {
  // Helper to get Monday of current week
  const getWeekStart = (date: Date): Date => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
  };
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {});
  typia.assert(memberAuth);
  // 3. Create 2 employees via admin API
  const firstEmployeeEmail = typia.random<string & tags.Format<"email">>();
  const firstEmployee = await api.functional.erpHrm.admin.employees.create(
    adminConnection,
    {
      body: {
        email: firstEmployeeEmail,
        roleId: typia.random<string & tags.Format<"uuid">>(),
        employmentType: "full-time",
      },
    },
  );
  typia.assert(firstEmployee);
  const secondEmployee = await api.functional.erpHrm.admin.employees.create(
    adminConnection,
    {
      body: {
        email: memberAuth.email,
        roleId: typia.random<string & tags.Format<"uuid">>(),
        employmentType: "full-time",
      },
    },
  );
  typia.assert(secondEmployee);
  // Get organizationId from employee response
  const orgId = (secondEmployee as any).role?.organization?.id;
  if (!orgId) {
    throw new Error("Failed to get organization ID from employee response");
  }
  // 4. Set organization context for member
  await api.functional.erpHrm.member.organization_context.select(
    memberConnection,
    {
      body: {
        organizationId: orgId,
      },
    },
  );
  // 5. Create project with budget hours
  const project = await api.functional.erpHrm.admin.projects.create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        color: "#" + RandomGenerator.alphabets(6).toUpperCase(),
        budgetHours: 10,
        status: "active",
      },
    },
  );
  typia.assert(project);
  // Get project ID
  const projectId = (project as any).id ?? (project as any).items?.[0]?.id;
  if (!projectId) {
    throw new Error("Failed to get project ID from response");
  }
  // 6. Create timelogs for member
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const timelog1 = await api.functional.erpHrm.member.timelogs.create(
    memberConnection,
    {
      body: {
        projectId: projectId,
        date: today.toISOString(),
        durationMinutes: 480,
      },
    },
  );
  typia.assert(timelog1);
  const timelog2 = await api.functional.erpHrm.member.timelogs.create(
    memberConnection,
    {
      body: {
        projectId: projectId,
        date: yesterday.toISOString(),
        durationMinutes: 240,
      },
    },
  );
  typia.assert(timelog2);
  // 7. Create and submit timesheet
  const timesheet = await api.functional.erpHrm.member.timesheets.create(
    memberConnection,
    {
      body: {
        weekStartDate: getWeekStart(today).toISOString(),
      },
    },
  );
  typia.assert(timesheet);
  await api.functional.erpHrm.member.timesheets.submit(memberConnection, {
    timesheetId: timesheet.id,
  });
  // 8. Retrieve dashboard
  const dashboard =
    await api.functional.erpHrm.admin.dashboard.organization.at(
      adminConnection,
    );
  typia.assert(dashboard);
  // Validations
  TestValidator.predicate(
    "employee count should be at least 2",
    dashboard.employeeCount >= 2,
  );
  TestValidator.predicate(
    "total hours this week should be non-negative",
    dashboard.totalHoursThisWeek >= 0,
  );
  TestValidator.predicate(
    "pending timesheets should be at least 1",
    dashboard.pendingTimesheetsCount >= 1,
  );
  TestValidator.predicate(
    "budgetAlertProjects is array",
    Array.isArray(dashboard.budgetAlertProjects),
  );
  TestValidator.predicate(
    "topPerformers is array",
    Array.isArray(dashboard.topPerformers),
  );
}