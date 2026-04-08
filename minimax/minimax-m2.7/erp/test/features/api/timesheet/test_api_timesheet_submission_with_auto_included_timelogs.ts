import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
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
import { generate_random_erp_hrm_admin_organizations_create } from "../../../generate/generate_random_erp_hrm_admin_organizations_create";
import { generate_random_erp_hrm_admin_projects_create } from "../../../generate/generate_random_erp_hrm_admin_projects_create";
import { generate_random_erp_hrm_member_organization_context_select } from "../../../generate/generate_random_erp_hrm_member_organization_context_select";
import { generate_random_erp_hrm_member_timelogs_create } from "../../../generate/generate_random_erp_hrm_member_timelogs_create";
import { generate_random_erp_hrm_member_timesheets_create } from "../../../generate/generate_random_erp_hrm_member_timesheets_create";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_organization_context } from "../../../prepare/prepare_random_erp_hrm_organization_context";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_timelog } from "../../../prepare/prepare_random_erp_hrm_timelog";
import { prepare_random_erp_hrm_timesheet } from "../../../prepare/prepare_random_erp_hrm_timesheet";

export async function test_api_timesheet_submission_with_auto_included_timelogs(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account and organization
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  const adminLoginConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminLoginConnection, {
    body: {
      email: admin.email,
      password: "testpassword123",
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    },
  });
  const organization = await generate_random_erp_hrm_admin_organizations_create(
    adminLoginConnection,
    {
      body: {
        name: "Test Organization " + RandomGenerator.alphabets(8),
        currency: "USD",
        timezone: "Asia/Seoul",
        fiscalStartMonth: 1,
      },
    },
  );
  // 2. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  // 3. Login as member
  const memberLoginConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(memberLoginConnection, {
    body: {
      email: member.email,
      password: "testpassword123",
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    },
  });
  // 4. Set organization context
  await generate_random_erp_hrm_member_organization_context_select(
    memberLoginConnection,
    {
      body: {
        organizationId: organization.id,
      },
    },
  );
  // 5. Create a project
  const projectReport = await generate_random_erp_hrm_admin_projects_create(
    adminLoginConnection,
    {
      body: {
        name: "Test Project " + RandomGenerator.alphabets(6),
        color: "#4A90E2",
        status: "active",
      },
    },
  );
  // Get project ID from the budget report response
  const projectId = projectReport.items[0].projectId;
  // 6. Create timelogs for the current week (Monday to Sunday)
  // Get current week's Monday
  const now = new Date();
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);
  monday.setHours(0, 0, 0, 0);
  const timelogDates = [
    new Date(monday),
    new Date(monday.getTime() + 86400000), // Tuesday
    new Date(monday.getTime() + 2 * 86400000), // Wednesday
  ];
  const timelogs: IErpHrmTimelog[] = [];
  for (const date of timelogDates) {
    const timelog = await generate_random_erp_hrm_member_timelogs_create(
      memberLoginConnection,
      {
        body: {
          projectId: projectId,
          date: date.toISOString(),
          durationMinutes: 480, // 8 hours
          description: "Work on project",
          billable: true,
        },
      },
    );
    typia.assert(timelog);
    timelogs.push(timelog);
  }
  // 7. Create draft timesheet for this week
  const timesheet = await generate_random_erp_hrm_member_timesheets_create(
    memberLoginConnection,
    {
      body: {
        weekStartDate: monday.toISOString(),
      },
    },
  );
  typia.assert(timesheet);
  // 8. Validate draft timesheet
  TestValidator.equals("status is draft", timesheet.status, "draft");
  TestValidator.predicate("week dates are Monday-Sunday", () => {
    const start = new Date(timesheet.weekStartDate);
    const end = new Date(timesheet.weekEndDate);
    return start.getDay() === 1 && end.getDay() === 0; // Monday=1, Sunday=0
  });
  TestValidator.predicate(
    "timelogs auto-included",
    timesheet.timesheetTimelogs.length > 0,
  );
  // Calculate expected total hours
  const expectedTotalMinutes = timelogs.reduce(
    (sum, t) => sum + t.durationMinutes,
    0,
  );
  const expectedTotalHours = expectedTotalMinutes / 60;
  TestValidator.equals(
    "total hours calculated",
    timesheet.totalHours,
    expectedTotalHours,
  );
  // 9. Submit the timesheet using PUT
  const submittedTimesheet =
    await api.functional.erpHrm.member.timesheets.update(
      memberLoginConnection,
      {
        timesheetId: timesheet.id,
        body: {
          status: "submitted",
        } satisfies IErpHrmTimesheet.IUpdate,
      },
    );
  typia.assert(submittedTimesheet);
  // 10. Validate submitted timesheet
  TestValidator.equals(
    "status is submitted",
    submittedTimesheet.status,
    "submitted",
  );
  TestValidator.predicate(
    "submitted_at is recorded",
    submittedTimesheet.submittedAt !== null,
  );
  TestValidator.equals(
    "total hours preserved",
    submittedTimesheet.totalHours,
    expectedTotalHours,
  );
  TestValidator.equals(
    "timelogs preserved",
    submittedTimesheet.timesheetTimelogs.length,
    timesheet.timesheetTimelogs.length,
  );
}
