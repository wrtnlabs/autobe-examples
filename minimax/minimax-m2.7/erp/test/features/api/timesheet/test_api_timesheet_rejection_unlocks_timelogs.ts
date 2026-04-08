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
import { generate_random_erp_hrm_admin_organizations_create } from "../../../generate/generate_random_erp_hrm_admin_organizations_create";
import { generate_random_erp_hrm_admin_projects_create } from "../../../generate/generate_random_erp_hrm_admin_projects_create";
import { generate_random_erp_hrm_member_organization_context_select } from "../../../generate/generate_random_erp_hrm_member_organization_context_select";
import { generate_random_erp_hrm_member_timelogs_create } from "../../../generate/generate_random_erp_hrm_member_timelogs_create";
import { generate_random_erp_hrm_member_timesheets_create } from "../../../generate/generate_random_erp_hrm_member_timesheets_create";
import { prepare_random_erp_hrm_employee } from "../../../prepare/prepare_random_erp_hrm_employee";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_organization_context } from "../../../prepare/prepare_random_erp_hrm_organization_context";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_timelog } from "../../../prepare/prepare_random_erp_hrm_timelog";
import { prepare_random_erp_hrm_timesheet } from "../../../prepare/prepare_random_erp_hrm_timesheet";

export async function test_api_timesheet_rejection_unlocks_timelogs(
  connection: api.IConnection,
): Promise<void> {
  // ============================================
  // STEP 1: Admin Setup
  // ============================================
  // Register admin account
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // Create organization (admin becomes owner)
  const organization = await api.functional.erpHrm.admin.organizations.create(
    adminConnection,
    {
      body: {
        name: `Test Org ${RandomGenerator.alphaNumeric(8)}`,
        currency: "USD",
        timezone: "Asia/Seoul",
        fiscalStartMonth: 1,
      } satisfies IErpHrmOrganization.ICreate,
    },
  );
  typia.assert(organization);
  // ============================================
  // STEP 2: Member Setup
  // ============================================
  // Register member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {});
  // Set organization context for member
  await api.functional.erpHrm.member.organization_context.select(
    memberConnection,
    {
      body: {
        organizationId: organization.id,
      } satisfies IErpHrmOrganizationContext.ICreate,
    },
  );
  // ============================================
  // STEP 3: Create Employee Record
  // ============================================
  // The member needs to be an employee to create timelogs
  // Owner role is automatically assigned when creating org, so we just need
  // to ensure member has an employee record
  const invitation = await api.functional.erpHrm.admin.employees.create(
    adminConnection,
    {
      body: {
        email: memberAuth.email,
        roleId: organization.owner.id,
        employmentType: "full-time",
      } satisfies IErpHrmEmployee.ICreate,
    },
  );
  typia.assert(invitation);
  // ============================================
  // STEP 4: Project Setup
  // ============================================
  // Create project using generate utility
  const projectResult = await generate_random_erp_hrm_admin_projects_create(
    adminConnection,
    {
      body: {
        name: `Test Project ${RandomGenerator.alphaNumeric(8)}`,
        color: "#4A90E2",
        status: "active",
      },
    },
  );
  // Extract project ID - the utility returns project with id via items
  // Get the first project's ID from the budget report items
  const projectId = projectResult.items[0]!.projectId;
  typia.assert(projectResult);
  // ============================================
  // STEP 5: Timelogs Setup
  // ============================================
  // Create first timelog
  const timelog1 = await api.functional.erpHrm.member.timelogs.create(
    memberConnection,
    {
      body: {
        projectId: projectId,
        date: new Date().toISOString(),
        durationMinutes: 120,
        description: "First timelog entry",
        billable: true,
      } satisfies IErpHrmTimelog.ICreate,
    },
  );
  typia.assert(timelog1);
  // Create second timelog
  const timelog2 = await api.functional.erpHrm.member.timelogs.create(
    memberConnection,
    {
      body: {
        projectId: projectId,
        date: new Date().toISOString(),
        durationMinutes: 90,
        description: "Second timelog entry",
        billable: true,
      } satisfies IErpHrmTimelog.ICreate,
    },
  );
  typia.assert(timelog2);
  // ============================================
  // STEP 6: Timesheet Setup
  // ============================================
  // Get current week's Monday
  const now = new Date();
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);
  monday.setHours(0, 0, 0, 0);
  // Create timesheet
  const timesheet = await api.functional.erpHrm.member.timesheets.create(
    memberConnection,
    {
      body: {
        weekStartDate: monday.toISOString(),
      } satisfies IErpHrmTimesheet.ICreate,
    },
  );
  typia.assert(timesheet);
  // Submit timesheet (this locks the timelogs)
  const submittedTimesheet =
    await api.functional.erpHrm.member.timesheets.submit(memberConnection, {
      timesheetId: timesheet.id,
    });
  typia.assert(submittedTimesheet);
  // Verify timesheet is submitted
  TestValidator.equals(
    "timesheet status is submitted",
    submittedTimesheet.status,
    "submitted",
  );
  // ============================================
  // STEP 7: Reject Timesheet
  // ============================================
  // Reject the timesheet - this should unlock the timelogs
  const rejectedTimesheet = await api.functional.erpHrm.admin.timesheets.reject(
    adminConnection,
    {
      timesheetId: timesheet.id,
      body: {
        rejectionReason:
          "Timesheet needs corrections. Please review and resubmit.",
      } satisfies IErpHrmTimesheet.IReject,
    },
  );
  typia.assert(rejectedTimesheet);
  // Verify timesheet is rejected
  TestValidator.equals(
    "timesheet status is rejected",
    rejectedTimesheet.status,
    "rejected",
  );
  TestValidator.equals(
    "rejection reason is set",
    rejectedTimesheet.rejectionReason,
    "Timesheet needs corrections. Please review and resubmit.",
  );
  TestValidator.predicate(
    "reviewedAt is set",
    rejectedTimesheet.reviewedAt !== null,
  );
  // ============================================
  // STEP 8: Verify Timelogs Are Unlocked
  // ============================================
  // After rejection, employee should be able to create new timelogs
  // This confirms timelogs are unlocked when timesheet returns to rejected status
  const newTimelog = await api.functional.erpHrm.member.timelogs.create(
    memberConnection,
    {
      body: {
        projectId: projectId,
        date: new Date().toISOString(),
        durationMinutes: 60,
        description: "New timelog after timesheet rejection",
        billable: true,
      } satisfies IErpHrmTimelog.ICreate,
    },
  );
  typia.assert(newTimelog);
  // Verify new timelog was created successfully
  TestValidator.predicate(
    "new timelog created after rejection",
    newTimelog.id !== timelog1.id && newTimelog.id !== timelog2.id,
  );
  TestValidator.equals(
    "timelog description matches",
    newTimelog.description,
    "New timelog after timesheet rejection",
  );
  TestValidator.equals(
    "timelog duration is 60 minutes",
    newTimelog.durationMinutes,
    60,
  );
}
