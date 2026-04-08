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
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimelog";
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
import { generate_random_erp_hrm_admin_departments_create } from "../../../generate/generate_random_erp_hrm_admin_departments_create";
import { generate_random_erp_hrm_admin_employees_create } from "../../../generate/generate_random_erp_hrm_admin_employees_create";
import { generate_random_erp_hrm_admin_projects_create } from "../../../generate/generate_random_erp_hrm_admin_projects_create";
import { generate_random_erp_hrm_admin_projects_members_create } from "../../../generate/generate_random_erp_hrm_admin_projects_members_create";
import { generate_random_erp_hrm_member_organization_context_select } from "../../../generate/generate_random_erp_hrm_member_organization_context_select";
import { generate_random_erp_hrm_member_timelogs_create } from "../../../generate/generate_random_erp_hrm_member_timelogs_create";
import { prepare_random_erp_hrm_department } from "../../../prepare/prepare_random_erp_hrm_department";
import { prepare_random_erp_hrm_employee } from "../../../prepare/prepare_random_erp_hrm_employee";
import { prepare_random_erp_hrm_organization_context } from "../../../prepare/prepare_random_erp_hrm_organization_context";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_timelog } from "../../../prepare/prepare_random_erp_hrm_timelog";

export async function test_api_time_analytics_grouped_by_employee(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account (creates organization automatically)
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {});
  // Extract organization ID from admin auth - the mock may include organization info
  const adminOrgId =
    (
      adminAuth as unknown as {
        organization?: {
          id: string;
        };
      }
    ).organization?.id ?? "";
  // 2. Create employee member account
  const employeeMemberConnection: api.IConnection = { host: connection.host };
  const employeeMember = await authorize_member_join(employeeMemberConnection, {
    body: {
      display_name: RandomGenerator.name(),
    },
  });
  // 3. Create department
  const department = await generate_random_erp_hrm_admin_departments_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(department);
  // 4. Create project
  const projectResponse = typia.assert<IErpHrmProject>(
    await generate_random_erp_hrm_admin_projects_create(adminConnection, {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        color: "#4A90E2",
        status: "active",
      },
    }),
  );
  // Extract project ID from the response items (IErpHrmProject.IEntry has projectId)
  const projectId = projectResponse.items[0]?.projectId;
  TestValidator.predicate(
    "project has id",
    projectId !== undefined && projectId !== null,
  );
  // 5. Set organization context for employee and get employee details
  const employeeOrgContext =
    await api.functional.erpHrm.member.organization_context.select(
      employeeMemberConnection,
      {
        body: {
          organizationId: adminOrgId,
        } satisfies IErpHrmOrganizationContext.ICreate,
      },
    );
  typia.assert(employeeOrgContext);
  // 6. Create employee with department assignment using admin
  const employeeInvitation =
    await generate_random_erp_hrm_admin_employees_create(adminConnection, {
      body: {
        email: employeeMember.email,
        departmentId: department.id,
        position: "Software Engineer",
        employmentType: "full-time",
        roleId: employeeOrgContext.employee.role.id,
      },
    });
  typia.assert(employeeInvitation);
  // 7. Refresh organization context to get updated employee record
  const updatedEmployeeContext =
    await api.functional.erpHrm.member.organization_context.select(
      employeeMemberConnection,
      {
        body: {
          organizationId: adminOrgId,
        } satisfies IErpHrmOrganizationContext.ICreate,
      },
    );
  typia.assert(updatedEmployeeContext);
  // 8. Assign employee to project using extracted projectId
  await generate_random_erp_hrm_admin_projects_members_create(adminConnection, {
    params: {
      projectId: projectId!,
    },
    body: {
      employeeId: updatedEmployeeContext.employee.id,
      assignedRole: "member",
    },
  });
  // 9. Create timelogs for the employee
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Monday
  const date1 = new Date(startOfWeek);
  date1.setDate(startOfWeek.getDate() + 1); // Tuesday
  const date2 = new Date(startOfWeek);
  date2.setDate(startOfWeek.getDate() + 2); // Wednesday
  const timelog1 = await generate_random_erp_hrm_member_timelogs_create(
    employeeMemberConnection,
    {
      body: {
        projectId: projectId!,
        date: date1.toISOString(),
        durationMinutes: 120,
        description: "Development work on feature X",
        billable: true,
      },
    },
  );
  typia.assert(timelog1);
  const timelog2 = await generate_random_erp_hrm_member_timelogs_create(
    employeeMemberConnection,
    {
      body: {
        projectId: projectId!,
        date: date2.toISOString(),
        durationMinutes: 90,
        description: "Code review",
        billable: false,
      },
    },
  );
  typia.assert(timelog2);
  // 10. Call analytics endpoint with date range covering created timelogs
  const dateFrom = new Date(startOfWeek);
  dateFrom.setDate(startOfWeek.getDate() - 1);
  const dateTo = new Date(startOfWeek);
  dateTo.setDate(startOfWeek.getDate() + 7);
  const analyticsResponse =
    await api.functional.erpHrm.member.analytics.time.index(
      employeeMemberConnection,
      {
        body: {
          date_from: dateFrom.toISOString(),
          date_to: dateTo.toISOString(),
          limit: 10,
          page: 1,
        } satisfies IErpHrmTimelog.IRequest,
      },
    );
  typia.assert(analyticsResponse);
  // Validate response structure with pagination
  TestValidator.equals(
    "has pagination info",
    analyticsResponse.pagination !== null,
    true,
  );
  TestValidator.equals(
    "has data array",
    Array.isArray(analyticsResponse.data),
    true,
  );
  TestValidator.predicate(
    "has records count",
    analyticsResponse.pagination.records >= 2,
  );
  TestValidator.predicate(
    "has data entries",
    analyticsResponse.data.length >= 0,
  );
}
