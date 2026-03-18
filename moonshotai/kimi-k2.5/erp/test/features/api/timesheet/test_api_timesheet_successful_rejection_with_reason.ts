import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import type { IErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_organization_members_create } from "../../../generate/generate_random_erp_hrm_member_organization_members_create";
import { generate_random_erp_hrm_member_organizations_create } from "../../../generate/generate_random_erp_hrm_member_organizations_create";
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { generate_random_erp_hrm_member_projects_members_create } from "../../../generate/generate_random_erp_hrm_member_projects_members_create";
import { generate_random_erp_hrm_member_roles_create } from "../../../generate/generate_random_erp_hrm_member_roles_create";
import { generate_random_erp_hrm_member_timelogs_create } from "../../../generate/generate_random_erp_hrm_member_timelogs_create";
import { generate_random_erp_hrm_member_timesheets_create } from "../../../generate/generate_random_erp_hrm_member_timesheets_create";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_organization_member } from "../../../prepare/prepare_random_erp_hrm_organization_member";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_role } from "../../../prepare/prepare_random_erp_hrm_role";
import { prepare_random_erp_hrm_role_permission } from "../../../prepare/prepare_random_erp_hrm_role_permission";
import { prepare_random_erp_hrm_timelog } from "../../../prepare/prepare_random_erp_hrm_timelog";
import { prepare_random_erp_hrm_timesheet } from "../../../prepare/prepare_random_erp_hrm_timesheet";

export async function test_api_timesheet_successful_rejection_with_reason(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create two members (approver and employee)
  const approverConnection: api.IConnection = { host: connection.host };
  const approverMember = await authorize_member_join(approverConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      firstName: "Approver",
      lastName: "User",
      avatarUrl: null,
      timezone: null,
      locale: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IErpHrmMember.IJoin,
  });
  typia.assert(approverMember);
  const employeeConnection: api.IConnection = { host: connection.host };
  const employeeMember = await authorize_member_join(employeeConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      firstName: "Employee",
      lastName: "User",
      avatarUrl: null,
      timezone: null,
      locale: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IErpHrmMember.IJoin,
  });
  typia.assert(employeeMember);
  // 2. Create organization as approver
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      approverConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: null,
          currency: "USD",
          timezone: "America/New_York",
          fiscal_year_start_month: 1,
        } satisfies IErpHrmOrganization.ICreate,
      },
    );
  typia.assert(organization);
  // 3. Create role with timesheet approval permission
  const approverRole = await generate_random_erp_hrm_member_roles_create(
    approverConnection,
    {
      body: {
        name: "Manager",
        description: "Role with timesheet approval permission",
        permissions: [
          { permission: "time:approve" },
          { permission: "employee:view" },
          { permission: "project:view" },
        ] satisfies IErpHrmRolePermission.ICreate[],
      } satisfies IErpHrmRole.ICreate,
    },
  );
  typia.assert(approverRole);
  // Create employee role
  const employeeRole = await generate_random_erp_hrm_member_roles_create(
    approverConnection,
    {
      body: {
        name: "Employee",
        description: "Standard employee role",
        permissions: [
          { permission: "time:view" },
          { permission: "time:log" },
        ] satisfies IErpHrmRolePermission.ICreate[],
      } satisfies IErpHrmRole.ICreate,
    },
  );
  typia.assert(employeeRole);
  // 4. Create organization members
  const approverOrgMember =
    await generate_random_erp_hrm_member_organization_members_create(
      approverConnection,
      {
        body: {
          organizationId: organization.id,
          userId: approverMember.id,
          roleId: approverRole.id,
          departmentId: null,
          position: "Manager",
          employmentType: "full_time",
          isActive: true,
        } satisfies IErpHrmOrganizationMember.ICreate,
      },
    );
  typia.assert(approverOrgMember);
  const employeeOrgMember =
    await generate_random_erp_hrm_member_organization_members_create(
      employeeConnection,
      {
        body: {
          organizationId: organization.id,
          userId: employeeMember.id,
          roleId: employeeRole.id,
          departmentId: null,
          position: "Developer",
          employmentType: "full_time",
          isActive: true,
        } satisfies IErpHrmOrganizationMember.ICreate,
      },
    );
  typia.assert(employeeOrgMember);
  // 5. Create project
  const project = await generate_random_erp_hrm_member_projects_create(
    approverConnection,
    {
      body: {
        name: "TestProject",
        colorCode: null,
        description: null,
        status: "active",
        budgetHours: null,
        startDate: null,
        endDate: null,
      } satisfies IErpHrmProject.ICreate,
    },
  );
  typia.assert(project);
  // 6. Assign employee to project
  const projectMember =
    await generate_random_erp_hrm_member_projects_members_create(
      approverConnection,
      {
        body: {
          organizationMemberId: employeeOrgMember.id,
          role: "member",
        } satisfies IErpHrmProjectMember.ICreate,
        params: {
          projectId: project.id,
        },
      },
    );
  typia.assert(projectMember);
  // 7. Create timelog for employee
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);
  const startTime = new Date(weekStart);
  startTime.setHours(9, 0, 0, 0);
  const endTime = new Date(weekStart);
  endTime.setHours(17, 0, 0, 0);
  const timelog = await generate_random_erp_hrm_member_timelogs_create(
    employeeConnection,
    {
      body: {
        project_id: project.id,
        task_id: null,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        billable: true,
        description: "Regular work day",
      } satisfies IErpHrmTimelog.ICreate,
    },
  );
  typia.assert(timelog);
  // 8. Create timesheet for employee
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  const timesheet = await generate_random_erp_hrm_member_timesheets_create(
    employeeConnection,
    {
      body: {
        weekStartDate: weekStart.toISOString(),
        weekEndDate: weekEnd.toISOString(),
      } satisfies IErpHrmTimesheet.ICreate,
    },
  );
  typia.assert(timesheet);
  // Verify initial state is draft
  TestValidator.equals(
    "initial timesheet status is draft",
    timesheet.status,
    "draft",
  );
  // 9. Submit the timesheet
  const submittedTimesheet =
    await api.functional.erpHrm.member.timesheets.submit(employeeConnection, {
      timesheetId: timesheet.id,
    });
  typia.assert(submittedTimesheet);
  TestValidator.equals(
    "timesheet status after submit",
    submittedTimesheet.status,
    "submitted",
  );
  TestValidator.predicate(
    "submittedAt is populated",
    submittedTimesheet.submittedAt !== null,
  );
  // 10. Reject the timesheet as approver
  const rejectionReason =
    "Hours incorrectly logged - please verify weekend entries";
  const rejectedTimesheet =
    await api.functional.erpHrm.member.timesheets.reject(approverConnection, {
      timesheetId: timesheet.id,
      body: {
        rejectionReason,
      } satisfies IErpHrmTimesheet.IReject,
    });
  typia.assert(rejectedTimesheet);
  // Verify rejection results
  TestValidator.equals(
    "timesheet status after reject",
    rejectedTimesheet.status,
    "rejected",
  );
  TestValidator.equals(
    "rejection reason matches",
    rejectedTimesheet.rejectionReason,
    rejectionReason,
  );
  TestValidator.predicate(
    "reviewedAt is populated",
    rejectedTimesheet.reviewedAt !== null,
  );
  TestValidator.equals(
    "submittedAt is cleared after reject",
    rejectedTimesheet.submittedAt,
    null,
  );
  // Verify reviewedBy contains approver's organizationMember summary
  if (rejectedTimesheet.reviewedBy !== null) {
    TestValidator.equals(
      "reviewedBy user ID matches approver",
      rejectedTimesheet.reviewedBy.user.id,
      approverMember.id,
    );
  } else {
    throw new Error("reviewedBy should not be null after rejection");
  }
  // Verify week dates and total hours are preserved
  TestValidator.equals(
    "week start date preserved",
    rejectedTimesheet.weekStartDate,
    timesheet.weekStartDate,
  );
  TestValidator.equals(
    "week end date preserved",
    rejectedTimesheet.weekEndDate,
    timesheet.weekEndDate,
  );
  TestValidator.predicate(
    "total hours is preserved and positive",
    rejectedTimesheet.totalHours >= 0,
  );
}
