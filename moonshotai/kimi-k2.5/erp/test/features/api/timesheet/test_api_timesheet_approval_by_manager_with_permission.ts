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

export async function test_api_timesheet_approval_by_manager_with_permission(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: First manager authenticates
  const managerConnection: api.IConnection = { host: connection.host };
  const managerAuth = await authorize_member_join(managerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      firstName: RandomGenerator.name(1),
      lastName: RandomGenerator.name(1),
      avatarUrl: null,
      timezone: "Asia/Seoul",
      locale: "en-US",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IErpHrmMember.IJoin,
  });
  typia.assert(managerAuth);
  // Step 2: Create organization
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      managerConnection,
      {
        body: {
          name: RandomGenerator.name(3),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          currency: "USD",
          timezone: "America/New_York",
          fiscal_year_start_month: 1,
        } satisfies IErpHrmOrganization.ICreate,
      },
    );
  typia.assert(organization);
  // Step 3: Create custom role with 'time:approve' permission
  const approvalRole = await generate_random_erp_hrm_member_roles_create(
    managerConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        description: "Role with timesheet approval permission",
        permissions: [
          { permission: "time:approve" },
        ] satisfies IErpHrmRolePermission.ICreate[],
      } satisfies IErpHrmRole.ICreate,
    },
  );
  typia.assert(approvalRole);
  // Step 4: Create organization member for first manager with approval role
  const managerOrgMember =
    await generate_random_erp_hrm_member_organization_members_create(
      managerConnection,
      {
        body: {
          organizationId: organization.id,
          userId: managerAuth.id,
          roleId: approvalRole.id,
          employmentType: "full_time",
          isActive: true,
          position: "Manager",
          departmentId: null,
        } satisfies IErpHrmOrganizationMember.ICreate,
      },
    );
  typia.assert(managerOrgMember);
  // Step 5: Create project
  const project = await generate_random_erp_hrm_member_projects_create(
    managerConnection,
    {
      body: {
        name: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        status: "active",
        budgetHours: 100,
      } satisfies IErpHrmProject.ICreate,
    },
  );
  typia.assert(project);
  // Step 6: Assign first manager as project member
  const projectMember =
    await generate_random_erp_hrm_member_projects_members_create(
      managerConnection,
      {
        body: {
          organizationMemberId: managerOrgMember.id,
          role: "project-lead",
        } satisfies IErpHrmProjectMember.ICreate,
        params: { projectId: project.id },
      },
    );
  typia.assert(projectMember);
  // Step 7: Create timelogs for the project (need at least 2 for submission)
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(9, 0, 0, 0);
  const timelog1 = await generate_random_erp_hrm_member_timelogs_create(
    managerConnection,
    {
      body: {
        project_id: project.id,
        start_time: weekStart.toISOString(),
        end_time: new Date(
          weekStart.getTime() + 2 * 60 * 60 * 1000,
        ).toISOString(),
        billable: true,
        description: "Worked on project tasks",
      } satisfies IErpHrmTimelog.ICreate,
    },
  );
  typia.assert(timelog1);
  const timelog2 = await generate_random_erp_hrm_member_timelogs_create(
    managerConnection,
    {
      body: {
        project_id: project.id,
        start_time: new Date(
          weekStart.getTime() + 3 * 60 * 60 * 1000,
        ).toISOString(),
        end_time: new Date(
          weekStart.getTime() + 5 * 60 * 60 * 1000,
        ).toISOString(),
        billable: true,
        description: "Continued project work",
      } satisfies IErpHrmTimelog.ICreate,
    },
  );
  typia.assert(timelog2);
  // Step 8: Create timesheet for the current week
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);
  const timesheet = await generate_random_erp_hrm_member_timesheets_create(
    managerConnection,
    {
      body: {
        weekStartDate: weekStart.toISOString(),
        weekEndDate: weekEnd.toISOString(),
      } satisfies IErpHrmTimesheet.ICreate,
    },
  );
  typia.assert(timesheet);
  TestValidator.equals(
    "timesheet initial status is draft",
    timesheet.status,
    "draft",
  );
  // Step 9: Submit timesheet
  const submittedTimesheet =
    await api.functional.erpHrm.member.timesheets.submit(managerConnection, {
      timesheetId: timesheet.id,
    });
  typia.assert(submittedTimesheet);
  TestValidator.equals(
    "timesheet status after submit",
    submittedTimesheet.status,
    "submitted",
  );
  TestValidator.predicate(
    "submitted_at is set after submission",
    submittedTimesheet.submittedAt !== null,
  );
  // Step 10: Second manager (approver) authenticates
  const approverConnection: api.IConnection = { host: connection.host };
  const approverAuth = await authorize_member_join(approverConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      firstName: RandomGenerator.name(1),
      lastName: RandomGenerator.name(1),
      avatarUrl: null,
      timezone: "Asia/Seoul",
      locale: "en-US",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IErpHrmMember.IJoin,
  });
  typia.assert(approverAuth);
  // Step 11: Create organization member for second manager with approval role
  const approverOrgMember =
    await generate_random_erp_hrm_member_organization_members_create(
      approverConnection,
      {
        body: {
          organizationId: organization.id,
          userId: approverAuth.id,
          roleId: approvalRole.id,
          employmentType: "full_time",
          isActive: true,
          position: "Senior Manager",
          departmentId: null,
        } satisfies IErpHrmOrganizationMember.ICreate,
      },
    );
  typia.assert(approverOrgMember);
  // Step 12: Approve the submitted timesheet
  const approvedTimesheet =
    await api.functional.erpHrm.member.timesheets.approve(approverConnection, {
      timesheetId: timesheet.id,
    });
  typia.assert(approvedTimesheet);
  // Validation: Verify timesheet status changed to 'approved'
  TestValidator.equals(
    "timesheet status after approval",
    approvedTimesheet.status,
    "approved",
  );
  // Validation: Confirm reviewed_at timestamp is set
  TestValidator.predicate(
    "reviewed_at is set",
    approvedTimesheet.reviewedAt !== null,
  );
  // Validation: Confirm reviewedBy is set and references the approving manager
  TestValidator.predicate(
    "reviewedBy is present",
    approvedTimesheet.reviewedBy !== null,
  );
  if (approvedTimesheet.reviewedBy !== null) {
    TestValidator.equals(
      "reviewedBy id matches approver org member",
      approvedTimesheet.reviewedBy.id,
      approverOrgMember.id,
    );
  }
  // Validation: Verify timelogs are included in the response
  TestValidator.predicate(
    "timelogs are present",
    approvedTimesheet.timelogs.length >= 2,
  );
  // Validation: Verify total hours is calculated
  TestValidator.predicate(
    "total hours is positive",
    approvedTimesheet.totalHours > 0,
  );
}
