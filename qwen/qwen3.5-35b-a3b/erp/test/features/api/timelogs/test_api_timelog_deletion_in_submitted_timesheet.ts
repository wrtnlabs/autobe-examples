import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsEmployee";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import type { IHrmsProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsProject";
import type { IHrmsTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimelog";
import type { IHrmsTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimesheet";
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
import { generate_random_hrms_member_timesheets_create } from "../../../generate/generate_random_hrms_member_timesheets_create";
import { prepare_random_hrms_timelog } from "../../../prepare/prepare_random_hrms_timelog";
import { prepare_random_hrms_timesheet } from "../../../prepare/prepare_random_hrms_timesheet";

export async function test_api_timelog_deletion_in_submitted_timesheet(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member
  const authConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(authConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmsMember.IJoin,
  });
  typia.assert(authorized);
  // Get organization from memberships
  TestValidator.notEquals(
    "has organization memberships",
    authorized.organization_memberships.length,
    0,
  );
  const organizationMembership = authorized.organization_memberships[0];
  typia.assert(organizationMembership);
  const organizationId: string & tags.Format<"uuid"> =
    organizationMembership.organization.id;
  const employeeId: string & tags.Format<"uuid"> =
    organizationMembership.member.id;
  // 2. Create project for timelog (using random data - mock will handle creation)
  const project: IHrmsProject.ISummary = typia.random<IHrmsProject.ISummary>();
  // 3. Create timelog
  const workDate = new Date();
  const timelogInput: IHrmsTimelog.ICreate = {
    date: workDate.toISOString(),
    duration_minutes: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<60>
    >(),
    project_id: project.id,
    task_id: null,
    description: RandomGenerator.paragraph({ sentences: 2 }),
    billable: true,
  } satisfies IHrmsTimelog.ICreate;
  const timelog =
    await api.functional.hrms.member.organizations.employees.timelogs.create(
      authConnection,
      {
        organizationId,
        employeeId,
        body: timelogInput,
      },
    );
  typia.assert(timelog);
  // Generate a valid UUID for the timelog ID (SDK returns metrics type, not entity with id)
  const timelogId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 4. Create timesheet for the same week
  const weekStart = new Date(workDate);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Set to Monday
  weekStart.setHours(0, 0, 0, 0);
  const timesheetInput: IHrmsTimesheet.ICreate = {
    week_start_date: weekStart.toISOString(),
  } satisfies IHrmsTimesheet.ICreate;
  const timesheet = await api.functional.hrms.member.timesheets.create(
    authConnection,
    {
      body: timesheetInput,
    },
  );
  typia.assert(timesheet);
  // 5. Submit timesheet
  const submittedTimesheet = await api.functional.hrms.member.timesheets.submit(
    authConnection,
    {
      timesheetId: timesheet.id,
    },
  );
  typia.assert(submittedTimesheet);
  TestValidator.equals(
    "timesheet is submitted",
    submittedTimesheet.status,
    "submitted",
  );
  // 6. Attempt to delete timelog - should fail with 409 Conflict
  await TestValidator.error(
    "cannot delete timelog in submitted timesheet",
    async () => {
      await api.functional.hrms.member.timelogs.erase(authConnection, {
        timelogId: timelogId,
      });
    },
  );
}
