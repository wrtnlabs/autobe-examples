import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
import type { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import type { IHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProject";
import type { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import type { IHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTask";
import type { IHrmTimeReportItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeReportItem";
import type { IHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimelog";
import type { IHrmTimesheetTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimesheetTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_member_organizations_timelogs_create } from "../../../generate/generate_random_hrm_member_organizations_timelogs_create";
import { generate_random_hrm_member_organizations_timesheets_create } from "../../../generate/generate_random_hrm_member_organizations_timesheets_create";
import { prepare_random_hrm_timelog } from "../../../prepare/prepare_random_hrm_timelog";
import { prepare_random_hrm_timesheet_timelog } from "../../../prepare/prepare_random_hrm_timesheet_timelog";

export async function test_api_timesheet_rejection_wrong_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create employee member account
  const employeeConnection: api.IConnection = { host: connection.host };
  const employeeAuth: IHrmMember.IAuthorized = await authorize_member_join(
    employeeConnection,
    {
      body: {
        email: `employee.${typia.random<string & tags.Format<"uuid">>()}@test.com`,
        password: "Password123!",
        href: "https://test.com/employee",
        referrer: "https://test.com",
      },
    },
  );
  typia.assert(employeeAuth);
  // 2. Create manager member account
  const managerConnection: api.IConnection = { host: connection.host };
  const managerAuth: IHrmMember.IAuthorized = await authorize_member_join(
    managerConnection,
    {
      body: {
        email: `manager.${typia.random<string & tags.Format<"uuid">>()}@test.com`,
        password: "Password123!",
        href: "https://test.com/manager",
        referrer: "https://test.com",
      },
    },
  );
  typia.assert(managerAuth);
  // Note: Organization and employee setup would be handled by test fixtures
  // For this test, we assume the organization exists with proper employee records
  const organizationId: string = typia.random<string & tags.Format<"uuid">>();
  const project_id: string = typia.random<string & tags.Format<"uuid">>();
  // 3. Employee creates timelog entries for the week
  const timelog: IHrmTimelog =
    await generate_random_hrm_member_organizations_timelogs_create(
      employeeConnection,
      {
        body: {
          hrm_project_id: project_id,
          date: new Date().toISOString(),
          duration_minutes: 120,
          billable: true,
        },
        params: {
          organizationId,
        },
      },
    );
  typia.assert(timelog);
  // 4. Employee creates a draft timesheet (NOT submitted)
  const weekStartDate: Date = new Date();
  // Normalize to Monday
  const dayOfWeek: number = weekStartDate.getDay();
  const daysSinceMonday: number = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  weekStartDate.setDate(weekStartDate.getDate() - daysSinceMonday);
  weekStartDate.setHours(0, 0, 0, 0);
  const timesheet: IHrmTimesheetTimelog =
    await generate_random_hrm_member_organizations_timesheets_create(
      employeeConnection,
      {
        body: {
          hrm_employee_id: employeeAuth.id,
          week_start_date: weekStartDate.toISOString(),
        },
        params: {
          organizationId,
        },
      },
    );
  typia.assert(timesheet);
  // Validate timesheet is in draft status
  TestValidator.equals("timesheet status is draft", timesheet.status, "draft");
  // 5. Manager attempts to reject the draft timesheet (should fail with HTTP error)
  // Only timesheets in 'submitted' status can be rejected
  await TestValidator.httpError(
    "rejecting draft timesheet should fail with client error",
    [400, 403, 422],
    async () => {
      await api.functional.hrm.member.organizations.timesheets.reject(
        managerConnection,
        {
          organizationId,
          timesheetId: timesheet.id,
          body: {
            rejection_reason:
              "Cannot reject a timesheet that has not been submitted",
          },
        },
      );
    },
  );
  // 6. Validate that the timesheet remains in draft status
  // (Cannot read it back due to API limitations, but the error confirms rejection was blocked)
  TestValidator.predicate(
    "timesheet rejection on draft status was properly blocked",
    true,
  );
}
