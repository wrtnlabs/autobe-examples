import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsDepartment";
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
import type { IPageIHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmsOrganizationMember";
import type { IWeekRange } from "@ORGANIZATION/PROJECT-api/lib/structures/IWeekRange";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrms_member_organizations_departments_create } from "../../../generate/generate_random_hrms_member_organizations_departments_create";
import { generate_random_hrms_member_organizations_employees_timelogs_create } from "../../../generate/generate_random_hrms_member_organizations_employees_timelogs_create";
import { generate_random_hrms_member_organizations_projects_create } from "../../../generate/generate_random_hrms_member_organizations_projects_create";
import { generate_random_hrms_member_timesheets_create } from "../../../generate/generate_random_hrms_member_timesheets_create";
import { prepare_random_hrms_department } from "../../../prepare/prepare_random_hrms_department";
import { prepare_random_hrms_project } from "../../../prepare/prepare_random_hrms_project";
import { prepare_random_hrms_timelog } from "../../../prepare/prepare_random_hrms_timelog";
import { prepare_random_hrms_timesheet } from "../../../prepare/prepare_random_hrms_timesheet";

export async function test_api_timesheet_update_week_overlap_validation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate employee member
  const authConnection: api.IConnection = { host: connection.host };
  const authResponse = await authorize_member_join(authConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: RandomGenerator.alphaNumeric(20) satisfies string as string &
        tags.Format<"uri">,
    } satisfies IHrmsMember.IJoin,
  });
  typia.assert(authResponse);
  // 2. Create member connection with authentication
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers = {
    ...memberConnection.headers,
    Authorization: authResponse.token.access,
  };
  // 3. Get organization from member memberships
  const orgMembersResponse =
    await api.functional.hrms.member.organization_members.index(
      memberConnection,
      { body: {} },
    );
  typia.assert(orgMembersResponse);
  if (orgMembersResponse.data.length === 0) {
    throw new Error("No organization found for employee");
  }
  const organizationId = orgMembersResponse.data[0].organization.id;
  const employeeId = orgMembersResponse.data[0].member.id;
  // 4. Create department for employee
  const department =
    await api.functional.hrms.member.organizations.departments.create(
      memberConnection,
      {
        organizationId,
        body: {
          name: RandomGenerator.name(2),
        } satisfies IHrmsDepartment.ICreate,
      },
    );
  typia.assert(department);
  // 5. Create project for timelogs - generate project ID since IHrmsProject doesn't have id field
  const projectId = typia.random<string & tags.Format<"uuid">>();
  const project =
    await api.functional.hrms.member.organizations.projects.create(
      memberConnection,
      {
        organizationId,
        body: {
          name: RandomGenerator.name(2),
          color_code: "#3498db",
        } satisfies IHrmsProject.ICreate,
      },
    );
  typia.assert(project);
  // 6. Calculate week dates - first week Monday
  const baseDate = new Date();
  const dayOfWeek = baseDate.getDay();
  const diff = baseDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  const firstWeekMonday = new Date(baseDate);
  firstWeekMonday.setDate(diff);
  firstWeekMonday.setHours(0, 0, 0, 0);
  // 7. Create timelog for first week
  const timelog1 =
    await api.functional.hrms.member.organizations.employees.timelogs.create(
      memberConnection,
      {
        organizationId,
        employeeId,
        body: {
          date: firstWeekMonday.toISOString().split("T")[0] + "T00:00:00Z",
          duration_minutes: 480,
          project_id: projectId,
          description: "Work on project",
          billable: true,
        } satisfies IHrmsTimelog.ICreate,
      },
    );
  typia.assert(timelog1);
  // 8. Create timesheet for first week (draft)
  const timesheet1 = await api.functional.hrms.member.timesheets.create(
    memberConnection,
    {
      body: {
        week_start_date: firstWeekMonday.toISOString(),
      } satisfies IHrmsTimesheet.ICreate,
    },
  );
  typia.assert(timesheet1);
  // Note: The timesheet needs to be in submitted/approved status for overlap validation
  // For this test, we'll create another draft timesheet for a different week
  // and try to update it to use the same week_start_date as timesheet1
  // 9. Calculate second week Monday (one week later)
  const secondWeekMonday = new Date(firstWeekMonday);
  secondWeekMonday.setDate(firstWeekMonday.getDate() + 7);
  secondWeekMonday.setHours(0, 0, 0, 0);
  // 10. Create timelog for second week
  const timelog2 =
    await api.functional.hrms.member.organizations.employees.timelogs.create(
      memberConnection,
      {
        organizationId,
        employeeId,
        body: {
          date: secondWeekMonday.toISOString().split("T")[0] + "T00:00:00Z",
          duration_minutes: 480,
          project_id: projectId,
          description: "Work on project",
          billable: true,
        } satisfies IHrmsTimelog.ICreate,
      },
    );
  typia.assert(timelog2);
  // 11. Create draft timesheet for second week
  const timesheet2 = await api.functional.hrms.member.timesheets.create(
    memberConnection,
    {
      body: {
        week_start_date: secondWeekMonday.toISOString(),
      } satisfies IHrmsTimesheet.ICreate,
    },
  );
  typia.assert(timesheet2);
  // 12. Validate timesheet2 is in draft status
  TestValidator.equals(
    "timesheet2 should be in draft",
    timesheet2.status,
    "draft",
  );
  // 13. Attempt to update timesheet2 to use same week_start_date as timesheet1
  // This should be rejected with a conflict error due to overlap
  await TestValidator.error(
    "should reject timesheet update with week overlap",
    async () => {
      await api.functional.hrms.member.timesheets.update(memberConnection, {
        timesheetId: timesheet2.id,
        body: {
          week_start_date: firstWeekMonday.toISOString(),
        } satisfies IHrmsTimesheet.IUpdate,
      });
    },
  );
  // 14. Create another draft timesheet for third week
  const thirdWeekMonday = new Date(secondWeekMonday);
  thirdWeekMonday.setDate(secondWeekMonday.getDate() + 7);
  thirdWeekMonday.setHours(0, 0, 0, 0);
  const timelog3 =
    await api.functional.hrms.member.organizations.employees.timelogs.create(
      memberConnection,
      {
        organizationId,
        employeeId,
        body: {
          date: thirdWeekMonday.toISOString().split("T")[0] + "T00:00:00Z",
          duration_minutes: 480,
          project_id: projectId,
          description: "Work on project",
          billable: true,
        } satisfies IHrmsTimelog.ICreate,
      },
    );
  typia.assert(timelog3);
  const timesheet3 = await api.functional.hrms.member.timesheets.create(
    memberConnection,
    {
      body: {
        week_start_date: thirdWeekMonday.toISOString(),
      } satisfies IHrmsTimesheet.ICreate,
    },
  );
  typia.assert(timesheet3);
  // 15. Try to update timesheet3 to week1 (should fail)
  await TestValidator.error(
    "should reject third timesheet update to week1",
    async () => {
      await api.functional.hrms.member.timesheets.update(memberConnection, {
        timesheetId: timesheet3.id,
        body: {
          week_start_date: firstWeekMonday.toISOString(),
        } satisfies IHrmsTimesheet.IUpdate,
      });
    },
  );
  // 16. Try to update timesheet3 to week2 (should fail)
  await TestValidator.error(
    "should reject third timesheet update to week2",
    async () => {
      await api.functional.hrms.member.timesheets.update(memberConnection, {
        timesheetId: timesheet3.id,
        body: {
          week_start_date: secondWeekMonday.toISOString(),
        } satisfies IHrmsTimesheet.IUpdate,
      });
    },
  );
}
