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
import { generate_random_hrm_member_organizations_timesheets_create } from "../../../generate/generate_random_hrm_member_organizations_timesheets_create";
import { prepare_random_hrm_timesheet_timelog } from "../../../prepare/prepare_random_hrm_timesheet_timelog";

export async function test_api_timesheet_update_after_rejection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create employee member account
  const employeeConnection: api.IConnection = { host: connection.host };
  const employeeAuth = await authorize_member_join(employeeConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(employeeAuth);
  // 2. Create manager member account
  const managerConnection: api.IConnection = { host: connection.host };
  const managerAuth = await authorize_member_join(managerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(managerAuth);
  // 3. Create organization (using manager as owner)
  // Note: Organization creation would require additional API calls not in available SDK
  // For this test, we'll use a generated organization ID
  const organizationId = typia.random<string & tags.Format<"uuid">>();
  // 4. Create draft timesheet for employee
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1); // Set to Monday
  weekStart.setHours(0, 0, 0, 0);
  const timesheet =
    await generate_random_hrm_member_organizations_timesheets_create(
      employeeConnection,
      {
        body: {
          hrm_employee_id: typia.random<string & tags.Format<"uuid">>(),
          week_start_date: weekStart.toISOString(),
        } satisfies IHrmTimesheetTimelog.ICreate,
      },
    );
  typia.assert(timesheet);
  // 5. Submit timesheet for approval
  const submittedTimesheet =
    await api.functional.hrm.member.organizations.timesheets.submit(
      employeeConnection,
      {
        organizationId,
        timesheetId: timesheet.id,
      },
    );
  typia.assert(submittedTimesheet);
  TestValidator.equals(
    "status is submitted",
    submittedTimesheet.status,
    "submitted",
  );
  // 6. Reject timesheet with reason (manager action)
  const rejectedTimesheet =
    await api.functional.hrm.member.organizations.timesheets.reject(
      managerConnection,
      {
        organizationId,
        timesheetId: timesheet.id,
        body: {
          rejection_reason: "Please review and correct the time entries",
        } satisfies IHrmTimesheetTimelog.IReject,
      },
    );
  typia.assert(rejectedTimesheet);
  TestValidator.equals(
    "status is rejected",
    rejectedTimesheet.status,
    "rejected",
  );
  TestValidator.predicate(
    "has rejection reason",
    rejectedTimesheet.rejection_reason !== null,
  );
  // 7. Update timesheet week period (employee action, should succeed in draft status)
  const newWeekStart = new Date(weekStart);
  newWeekStart.setDate(newWeekStart.getDate() + 7); // Next week Monday
  newWeekStart.setHours(0, 0, 0, 0);
  const updatedTimesheet = await api.functional.hrm.member.timesheets.update(
    employeeConnection,
    {
      timesheetId: timesheet.id,
      body: {
        week_start_date: newWeekStart.toISOString(),
      } satisfies IHrmTimesheetTimelog.IUpdate,
    },
  );
  typia.assert(updatedTimesheet);
  // 8. Validate the timesheet was updated successfully
  TestValidator.equals(
    "status is draft after rejection",
    updatedTimesheet.status,
    "draft",
  );
  TestValidator.equals(
    "week start date updated",
    updatedTimesheet.week_start_date,
    newWeekStart.toISOString(),
  );
}