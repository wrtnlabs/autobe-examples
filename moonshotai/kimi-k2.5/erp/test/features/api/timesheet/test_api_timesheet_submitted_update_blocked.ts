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

export async function test_api_timesheet_submitted_update_blocked(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorizedMember = await authorize_member_join(memberConnection, {
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
    },
  });
  typia.assert(authorizedMember);
  // 2. Create an organization
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          currency: "USD",
          timezone: "America/New_York",
          fiscal_year_start_month: 1,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(organization);
  // 3. Create a role with necessary permissions
  const role = await generate_random_erp_hrm_member_roles_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 1 }),
        permissions: [
          { permission: "organization.manage" },
          { permission: "employee.manage" },
          { permission: "project.manage" },
          { permission: "time.manage" },
        ] satisfies IErpHrmRolePermission.ICreate[],
      },
    },
  );
  typia.assert(role);
  // 4. Create organization member
  const orgMember =
    await generate_random_erp_hrm_member_organization_members_create(
      memberConnection,
      {
        body: {
          organizationId: organization.id,
          userId: authorizedMember.id,
          roleId: role.id,
          employmentType: "full_time",
          isActive: true,
          position: "Developer",
        },
      },
    );
  typia.assert(orgMember);
  // 5. Create a project
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        status: "active",
        colorCode: "#FF5733",
        budgetHours: 100,
      },
    },
  );
  typia.assert(project);
  // 6. Assign member to project
  const projectMember =
    await generate_random_erp_hrm_member_projects_members_create(
      memberConnection,
      {
        params: { projectId: project.id },
        body: {
          organizationMemberId: orgMember.id,
          role: "member",
        },
      },
    );
  typia.assert(projectMember);
  // Calculate week boundaries
  const weekStart = new Date();
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Sunday
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6); // Saturday
  // 7. Create timelogs for the week
  const timelog1 = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        project_id: project.id,
        start_time: new Date(
          weekStart.getTime() + 9 * 60 * 60 * 1000,
        ).toISOString(), // 9 AM
        end_time: new Date(
          weekStart.getTime() + 17 * 60 * 60 * 1000,
        ).toISOString(), // 5 PM
        billable: true,
        description: "Initial work session",
      },
    },
  );
  typia.assert(timelog1);
  // 8. Create a timesheet for the week
  const timesheet = await generate_random_erp_hrm_member_timesheets_create(
    memberConnection,
    {
      body: {
        weekStartDate: weekStart.toISOString(),
        weekEndDate: weekEnd.toISOString(),
      },
    },
  );
  typia.assert(timesheet);
  // Verify timesheet is in draft status
  TestValidator.equals("timesheet initial status", timesheet.status, "draft");
  // Add timelog to timesheet and submit it
  const timesheetWithTimelog =
    await api.functional.erpHrm.member.timesheets.update(memberConnection, {
      timesheetId: timesheet.id,
      body: {
        timelogsToAdd: [timelog1.id],
      } satisfies IErpHrmTimesheet.IUpdate,
    });
  typia.assert(timesheetWithTimelog);
  TestValidator.equals(
    "timelog added to timesheet",
    timesheetWithTimelog.timelogs.length,
    1,
  );
  // 9. Submit the timesheet
  const submittedTimesheet =
    await api.functional.erpHrm.member.timesheets.update(memberConnection, {
      timesheetId: timesheet.id,
      body: {
        status: "submitted",
      } satisfies IErpHrmTimesheet.IUpdate,
    });
  typia.assert(submittedTimesheet);
  TestValidator.equals(
    "timesheet status after submit",
    submittedTimesheet.status,
    "submitted",
  );
  TestValidator.predicate(
    "timesheet has submittedAt",
    submittedTimesheet.submittedAt !== null,
  );
  // 10. Create an additional timelog to attempt adding later
  const timelog2 = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        project_id: project.id,
        start_time: new Date(
          weekStart.getTime() + 10 * 60 * 60 * 1000,
        ).toISOString(), // 10 AM next day
        end_time: new Date(
          weekStart.getTime() + 16 * 60 * 60 * 1000,
        ).toISOString(), // 4 PM
        billable: true,
        description: "Additional work session",
      },
    },
  );
  typia.assert(timelog2);
  // 11. Attempt to update the submitted timesheet and verify it fails
  await TestValidator.error(
    "should reject update to submitted timesheet",
    async () => {
      await api.functional.erpHrm.member.timesheets.update(memberConnection, {
        timesheetId: timesheet.id,
        body: {
          timelogsToAdd: [timelog2.id],
        } satisfies IErpHrmTimesheet.IUpdate,
      });
    },
  );
  // 12. Verify the timesheet remains unchanged by attempting another operation that should fail
  // Since we can't fetch the timesheet again (no GET endpoint), we verify by trying another update
  await TestValidator.error(
    "should reject status change on submitted timesheet",
    async () => {
      await api.functional.erpHrm.member.timesheets.update(memberConnection, {
        timesheetId: timesheet.id,
        body: {
          status: "draft",
        } satisfies IErpHrmTimesheet.IUpdate,
      });
    },
  );
}
