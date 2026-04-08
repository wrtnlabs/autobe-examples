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

export async function test_api_time_analytics_billable_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - create admin account
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create organization context for admin (to get organization ID and role)
  const adminOrgContext =
    await generate_random_erp_hrm_member_organization_context_select(
      adminConnection,
      {},
    );
  const organizationId = adminOrgContext.organization.id;
  const ownerRoleId = adminOrgContext.employee.role.id;
  // 3. Create project - use type assertion to access actual project data
  const projectResponse = await generate_random_erp_hrm_admin_projects_create(
    adminConnection,
    {
      body: {
        name: `Test Project ${RandomGenerator.alphabets(8)}`,
        color: "#FF5733",
        status: "active",
      },
    },
  );
  typia.assert(projectResponse);
  // Access actual project data via type assertion
  const projectData = projectResponse as any;
  const projectId = projectData.id;
  // 4. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(memberAuth);
  // 5. Create employee (member) in organization
  const employee = await generate_random_erp_hrm_admin_employees_create(
    adminConnection,
    {
      body: {
        email: memberAuth.email,
        roleId: ownerRoleId,
        employmentType: "full-time",
      },
    },
  );
  typia.assert(employee);
  // Get employee ID from invitation response
  const employeeData = employee as any;
  const employeeId =
    employeeData.employee?.id ?? employeeData.member?.id ?? employeeData.id;
  // 6. Set organization context for member
  await generate_random_erp_hrm_member_organization_context_select(
    memberConnection,
    {
      body: {
        organizationId: organizationId,
      },
    },
  );
  // 7. Assign employee to project
  await generate_random_erp_hrm_admin_projects_members_create(adminConnection, {
    params: {
      projectId: projectId,
    },
    body: {
      employeeId: employeeId,
      assignedRole: "member",
    },
  });
  // 8. Create timelogs with different billable status
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const toDateString = (d: Date) => d.toISOString();
  // Create billable timelogs (3 entries)
  const billableDuration1 = 120; // 2 hours
  const billableDuration2 = 90; // 1.5 hours
  const billableDuration3 = 60; // 1 hour
  const billableTimelog1 = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        projectId: projectId,
        date: toDateString(yesterday),
        durationMinutes: billableDuration1,
        billable: true,
        description: "Billable work item 1",
      },
    },
  );
  typia.assert(billableTimelog1);
  const billableTimelog2 = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        projectId: projectId,
        date: toDateString(yesterday),
        durationMinutes: billableDuration2,
        billable: true,
        description: "Billable work item 2",
      },
    },
  );
  typia.assert(billableTimelog2);
  const billableTimelog3 = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        projectId: projectId,
        date: toDateString(today),
        durationMinutes: billableDuration3,
        billable: true,
        description: "Billable work item 3",
      },
    },
  );
  typia.assert(billableTimelog3);
  // Create non-billable timelogs (2 entries)
  const nonBillableDuration1 = 45; // 45 minutes
  const nonBillableDuration2 = 30; // 30 minutes
  const nonBillableTimelog1 =
    await generate_random_erp_hrm_member_timelogs_create(memberConnection, {
      body: {
        projectId: projectId,
        date: toDateString(yesterday),
        durationMinutes: nonBillableDuration1,
        billable: false,
        description: "Non-billable work item 1",
      },
    });
  typia.assert(nonBillableTimelog1);
  const nonBillableTimelog2 =
    await generate_random_erp_hrm_member_timelogs_create(memberConnection, {
      body: {
        projectId: projectId,
        date: toDateString(today),
        durationMinutes: nonBillableDuration2,
        billable: false,
        description: "Non-billable work item 2",
      },
    });
  typia.assert(nonBillableTimelog2);
  // 9. Call analytics with billable=true filter
  const billableReport =
    await api.functional.erpHrm.member.analytics.time.index(memberConnection, {
      body: {
        date_from: toDateString(yesterday),
        date_to: toDateString(today),
        billable: true,
        project_id: projectId,
      },
    });
  typia.assert(billableReport);
  // 10. Call analytics with billable=false filter
  const nonBillableReport =
    await api.functional.erpHrm.member.analytics.time.index(memberConnection, {
      body: {
        date_from: toDateString(yesterday),
        date_to: toDateString(today),
        billable: false,
        project_id: projectId,
      },
    });
  typia.assert(nonBillableReport);
  // 11. Calculate expected totals
  const totalBillableMinutes =
    billableDuration1 + billableDuration2 + billableDuration3;
  const totalNonBillableMinutes = nonBillableDuration1 + nonBillableDuration2;
  const grandTotalMinutes = totalBillableMinutes + totalNonBillableMinutes;
  // 12. Validate billable report - analytics returns aggregated summaries
  // The response contains grouped data with billableMinutes, nonBillableMinutes, etc.
  TestValidator.equals(
    "billable report has data",
    billableReport.data.length > 0,
    true,
  );
  // Find the project group in billable report
  const billableProjectGroup = billableReport.data.find(
    (summary) => summary.project?.id === projectId,
  );
  if (billableProjectGroup) {
    TestValidator.equals(
      "billable report - billableMinutes matches expected",
      billableProjectGroup.billableMinutes,
      totalBillableMinutes,
    );
    TestValidator.equals(
      "billable report - nonBillableMinutes is 0",
      billableProjectGroup.nonBillableMinutes,
      0,
    );
    TestValidator.equals(
      "billable report - totalMinutes equals billableMinutes",
      billableProjectGroup.totalMinutes,
      totalBillableMinutes,
    );
    TestValidator.equals(
      "billable report - timelogCount is 3",
      billableProjectGroup.timelogCount,
      3,
    );
    TestValidator.equals(
      "billable report - groupBy is project",
      billableProjectGroup.groupBy,
      "project",
    );
  }
  // 13. Validate non-billable report
  const nonBillableProjectGroup = nonBillableReport.data.find(
    (summary) => summary.project?.id === projectId,
  );
  if (nonBillableProjectGroup) {
    TestValidator.equals(
      "non-billable report - billableMinutes is 0",
      nonBillableProjectGroup.billableMinutes,
      0,
    );
    TestValidator.equals(
      "non-billable report - nonBillableMinutes matches expected",
      nonBillableProjectGroup.nonBillableMinutes,
      totalNonBillableMinutes,
    );
    TestValidator.equals(
      "non-billable report - totalMinutes equals nonBillableMinutes",
      nonBillableProjectGroup.totalMinutes,
      totalNonBillableMinutes,
    );
    TestValidator.equals(
      "non-billable report - timelogCount is 2",
      nonBillableProjectGroup.timelogCount,
      2,
    );
  }
  // 14. Call analytics without billable filter to get combined totals
  const allReport = await api.functional.erpHrm.member.analytics.time.index(
    memberConnection,
    {
      body: {
        date_from: toDateString(yesterday),
        date_to: toDateString(today),
        project_id: projectId,
      },
    },
  );
  typia.assert(allReport);
  const allProjectGroup = allReport.data.find(
    (summary) => summary.project?.id === projectId,
  );
  if (allProjectGroup) {
    TestValidator.equals(
      "all report - totalMinutes equals grand total",
      allProjectGroup.totalMinutes,
      grandTotalMinutes,
    );
    TestValidator.equals(
      "all report - billableMinutes + nonBillableMinutes equals totalMinutes",
      allProjectGroup.billableMinutes + allProjectGroup.nonBillableMinutes,
      grandTotalMinutes,
    );
    TestValidator.equals(
      "all report - timelogCount is 5",
      allProjectGroup.timelogCount,
      5,
    );
  }
}
