import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsEmployee";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import type { IHrmsProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsProject";
import type { IHrmsTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTask";
import type { IHrmsTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimelog";
import type { IHrmsTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimer";
import type { IHrmsTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimesheet";
import type { IHrmsTopEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTopEmployee";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmsOrganization";
import type { IWeekRange } from "@ORGANIZATION/PROJECT-api/lib/structures/IWeekRange";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrms_member_organizations_employees_timelogs_create } from "../../../generate/generate_random_hrms_member_organizations_employees_timelogs_create";
import { generate_random_hrms_member_organizations_projects_create } from "../../../generate/generate_random_hrms_member_organizations_projects_create";
import { generate_random_hrms_member_timesheets_create } from "../../../generate/generate_random_hrms_member_timesheets_create";
import { prepare_random_hrms_project } from "../../../prepare/prepare_random_hrms_project";
import { prepare_random_hrms_timelog } from "../../../prepare/prepare_random_hrms_timelog";
import { prepare_random_hrms_timesheet } from "../../../prepare/prepare_random_hrms_timesheet";

export async function test_api_timesheet_deletion_submitted_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member
  const authConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(authConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member);
  // 2. Create member connection
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: member.token.access },
  };
  // 3. Get organizations
  const orgs = await api.functional.hrms.member.organizations.index(
    memberConnection,
    {
      body: {},
    },
  );
  typia.assert(orgs);
  TestValidator.predicate(
    "has at least one organization",
    orgs.data.length > 0,
  );
  const organization = orgs.data[0];
  // 4. Switch to organization
  await api.functional.hrms.member.organizations._switch.switchOrganization(
    memberConnection,
    { body: {} as any },
  );
  // 5. Create project
  const project =
    await generate_random_hrms_member_organizations_projects_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          color_code: "#3498db",
        },
        params: { organizationId: organization.id },
      },
    );
  typia.assert(project);
  // 6. Get employee ID from member's organization membership
  const employeeId = member.organization_memberships[0].member.id;
  // 7. Create first timelog
  const weekStart = new Date();
  weekStart.setDate(
    weekStart.getDate() -
      weekStart.getDay() +
      (weekStart.getDay() === 0 ? -6 : 1),
  );
  const weekStartStr = weekStart.toISOString();
  const timelog1 =
    await generate_random_hrms_member_organizations_employees_timelogs_create(
      memberConnection,
      {
        body: prepare_random_hrms_timelog({
          date: weekStart.toISOString(),
          duration_minutes: 480,
          project_id: (project as any).id,
          billable: true,
          description: "Work on project",
        }),
        params: { organizationId: organization.id, employeeId },
      },
    );
  typia.assert(timelog1);
  // 8. Create second timelog
  const timelog2 =
    await generate_random_hrms_member_organizations_employees_timelogs_create(
      memberConnection,
      {
        body: prepare_random_hrms_timelog({
          date: weekStart.toISOString(),
          duration_minutes: 360,
          project_id: (project as any).id,
          billable: false,
        }),
        params: { organizationId: organization.id, employeeId },
      },
    );
  typia.assert(timelog2);
  // 9. Create first timesheet
  const timesheet1 = await generate_random_hrms_member_timesheets_create(
    memberConnection,
    {
      body: prepare_random_hrms_timesheet({ week_start_date: weekStartStr }),
    },
  );
  typia.assert(timesheet1);
  // 10. Submit first timesheet
  const submittedTimesheet1 =
    await api.functional.hrms.member.timesheets.submit(memberConnection, {
      timesheetId: timesheet1.id,
    });
  typia.assert(submittedTimesheet1);
  TestValidator.equals(
    "timesheet1 status is submitted",
    submittedTimesheet1.status,
    "submitted",
  );
  // 11. Test delete submitted timesheet - should fail with 403
  await TestValidator.httpError(
    "submitted timesheet cannot be deleted",
    [403],
    async () =>
      await api.functional.hrms.member.timesheets.erase(memberConnection, {
        timesheetId: timesheet1.id,
      }),
  );
  // 12. Create second timesheet
  const timesheet2 = await generate_random_hrms_member_timesheets_create(
    memberConnection,
    {
      body: prepare_random_hrms_timesheet({ week_start_date: weekStartStr }),
    },
  );
  typia.assert(timesheet2);
  // Submit second timesheet
  const submittedTimesheet2 =
    await api.functional.hrms.member.timesheets.submit(memberConnection, {
      timesheetId: timesheet2.id,
    });
  typia.assert(submittedTimesheet2);
  // 13. Approve second timesheet
  const approvedTimesheet = await api.functional.hrms.member.timesheets.approve(
    memberConnection,
    { timesheetId: timesheet2.id },
  );
  typia.assert(approvedTimesheet);
  TestValidator.equals(
    "timesheet2 status is approved",
    approvedTimesheet.status,
    "approved",
  );
  // 14. Test delete approved timesheet - should fail with 403
  await TestValidator.httpError(
    "approved timesheet cannot be deleted",
    [403],
    async () =>
      await api.functional.hrms.member.timesheets.erase(memberConnection, {
        timesheetId: timesheet2.id,
      }),
  );
}