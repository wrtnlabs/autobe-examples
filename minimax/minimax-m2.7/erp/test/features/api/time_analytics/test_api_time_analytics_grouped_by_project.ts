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
import { generate_random_erp_hrm_admin_employees_create } from "../../../generate/generate_random_erp_hrm_admin_employees_create";
import { generate_random_erp_hrm_admin_projects_create } from "../../../generate/generate_random_erp_hrm_admin_projects_create";
import { generate_random_erp_hrm_admin_projects_members_create } from "../../../generate/generate_random_erp_hrm_admin_projects_members_create";
import { generate_random_erp_hrm_member_organization_context_select } from "../../../generate/generate_random_erp_hrm_member_organization_context_select";
import { generate_random_erp_hrm_member_timelogs_create } from "../../../generate/generate_random_erp_hrm_member_timelogs_create";
import { prepare_random_erp_hrm_employee } from "../../../prepare/prepare_random_erp_hrm_employee";
import { prepare_random_erp_hrm_organization_context } from "../../../prepare/prepare_random_erp_hrm_organization_context";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_timelog } from "../../../prepare/prepare_random_erp_hrm_timelog";

export async function test_api_time_analytics_grouped_by_project(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  // Step 2: Authenticate as admin (creates organization)
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  // Step 3: Create an employee for the member
  const invitation = await api.functional.erpHrm.admin.employees.create(
    adminConnection,
    {
      body: {
        email: member.email,
        roleId: typia.random<string & tags.Format<"uuid">>(),
        employmentType: "full-time",
      } satisfies IErpHrmEmployee.ICreate,
    },
  );
  typia.assert(invitation);
  const orgId = invitation.organization.id;
  // Step 4: Set organization context for the member - this returns employee ID
  const orgContext =
    await api.functional.erpHrm.member.organization_context.select(
      memberConnection,
      {
        body: {
          organizationId: orgId,
        } satisfies IErpHrmOrganizationContext.ICreate,
      },
    );
  typia.assert(orgContext);
  const employeeId = orgContext.employee.id;
  // Step 5: Create a project
  const project = await api.functional.erpHrm.admin.projects.create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        color: "#" + RandomGenerator.alphabets(6),
      } satisfies IErpHrmProject.ICreate,
    },
  );
  typia.assert(project);
  const projectId = (typia.assert(project) as unknown as { id: string }).id;
  // Step 6: Assign employee to project
  await api.functional.erpHrm.admin.projects.members.create(adminConnection, {
    projectId: projectId,
    body: {
      employeeId: employeeId,
      assignedRole: "member",
    } satisfies IErpHrmProjectMember.ICreate,
  });
  // Step 7: Create multiple timelogs (mix of billable and non-billable)
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0] + "T00:00:00.000Z";
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0] + "T00:00:00.000Z";
  // Billable timelog 1
  const timelog1 = await api.functional.erpHrm.member.timelogs.create(
    memberConnection,
    {
      body: {
        projectId: projectId,
        date: todayStr,
        durationMinutes: 120,
        description: RandomGenerator.paragraph({ sentences: 1 }),
        billable: true,
      } satisfies IErpHrmTimelog.ICreate,
    },
  );
  typia.assert(timelog1);
  // Billable timelog 2
  const timelog2 = await api.functional.erpHrm.member.timelogs.create(
    memberConnection,
    {
      body: {
        projectId: projectId,
        date: todayStr,
        durationMinutes: 90,
        description: RandomGenerator.paragraph({ sentences: 1 }),
        billable: true,
      } satisfies IErpHrmTimelog.ICreate,
    },
  );
  typia.assert(timelog2);
  // Non-billable timelog
  const timelog3 = await api.functional.erpHrm.member.timelogs.create(
    memberConnection,
    {
      body: {
        projectId: projectId,
        date: yesterdayStr,
        durationMinutes: 60,
        description: RandomGenerator.paragraph({ sentences: 1 }),
        billable: false,
      } satisfies IErpHrmTimelog.ICreate,
    },
  );
  typia.assert(timelog3);
  // Step 8: Call analytics endpoint with group_by='project'
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const analytics = await api.functional.erpHrm.member.analytics.time.index(
    memberConnection,
    {
      body: {
        date_from: firstDayOfMonth.toISOString() as string &
          tags.Format<"date-time">,
        date_to: lastDayOfMonth.toISOString() as string &
          tags.Format<"date-time">,
        limit: 100,
        page: 1,
      } satisfies IErpHrmTimelog.IRequest,
    },
  );
  // Validate response structure
  typia.assert(analytics);
  // Validate pagination exists
  TestValidator.equals(
    "pagination exists",
    analytics.pagination !== undefined,
    true,
  );
  TestValidator.equals(
    "pagination records >= 0",
    analytics.pagination.records >= 0,
    true,
  );
  // Validate data array exists
  TestValidator.equals(
    "data array exists",
    Array.isArray(analytics.data),
    true,
  );
  // Since we created timelogs for the project, there should be at least one result
  TestValidator.predicate(
    "has at least one project result",
    analytics.data.length > 0,
  );
  // Verify the first result is grouped by project
  const firstResult = analytics.data[0];
  TestValidator.equals("grouped by project", firstResult.groupBy, "project");
  // Validate project details are included
  TestValidator.notEquals("project details exist", firstResult.project, null);
  // Validate totalMinutes is valid
  TestValidator.predicate(
    "totalMinutes is non-negative",
    firstResult.totalMinutes >= 0,
  );
  TestValidator.predicate(
    "billableMinutes is non-negative",
    firstResult.billableMinutes >= 0,
  );
  TestValidator.predicate(
    "nonBillableMinutes is non-negative",
    firstResult.nonBillableMinutes >= 0,
  );
  // Validate billable + nonBillable = total
  TestValidator.equals(
    "billable + nonBillable equals total",
    firstResult.billableMinutes + firstResult.nonBillableMinutes,
    firstResult.totalMinutes,
  );
  // Validate timelogCount
  TestValidator.predicate(
    "timelogCount is valid",
    firstResult.timelogCount >= 0,
  );
  // Validate results sorted by totalMinutes descending
  for (let i = 0; i < analytics.data.length - 1; i++) {
    TestValidator.predicate(
      `sorted by totalMinutes descending (index ${i})`,
      analytics.data[i].totalMinutes >= analytics.data[i + 1].totalMinutes,
    );
  }
}