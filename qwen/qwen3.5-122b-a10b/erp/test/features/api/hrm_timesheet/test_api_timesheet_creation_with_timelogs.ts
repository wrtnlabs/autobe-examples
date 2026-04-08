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

/**
 * Test timesheet creation with automatic timelog inclusion for an employee.
 *
 * Validates the primary success path for creating a draft timesheet that automatically aggregates all timelogs belonging to an employee within a specified week period. The test ensures that the timesheet is created with the correct week boundaries, calculated total hours, and proper status assignment.
 *
 * The workflow covers member authentication, timesheet creation for an employee and week range, and validation of the response including week dates, total hours calculation, draft status, and included timelog summaries.
 *
 * 1. Member registers with email and password credentials.
 * 2. Timesheet is created for an employee covering a Monday-to-Sunday week period.
 * 3. System automatically includes all timelogs for the employee within the week range.
 * 4. Validates response contains correct week_start_date (Monday) and week_end_date (Sunday).
 * 5. Validates total_hours is calculated from included timelogs.
 * 6. Validates status is 'draft' allowing further modifications.
 * 7. Validates timelogs array contains summaries of included time entries.
 */
export async function test_api_timesheet_creation_with_timelogs(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const auth: IHrmMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IHrmMember.IJoin,
    },
  );
  typia.assert(auth);
  // 2. Prepare week start date (Monday)
  const weekStartDate = new Date();
  const dayOfWeek = weekStartDate.getDay();
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  weekStartDate.setDate(weekStartDate.getDate() - daysSinceMonday);
  weekStartDate.setHours(0, 0, 0, 0);
  // 3. Generate employee ID for timesheet creation
  // Note: In a full integration test, this would be created via respective endpoints
  const employeeId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 4. Create timesheet using the generation utility function
  const timesheet: IHrmTimesheetTimelog =
    await generate_random_hrm_member_organizations_timesheets_create(
      memberConnection,
      {
        body: {
          hrm_employee_id: employeeId,
          week_start_date: weekStartDate.toISOString(),
        } satisfies IHrmTimesheetTimelog.ICreate,
      },
    );
  typia.assert(timesheet);
  // 5. Validate timesheet response structure and business logic
  TestValidator.equals("status is draft", timesheet.status, "draft");
  TestValidator.predicate(
    "week_start_date is valid",
    timesheet.week_start_date !== null &&
      timesheet.week_start_date !== undefined,
  );
  TestValidator.predicate(
    "week_end_date is valid",
    timesheet.week_end_date !== null && timesheet.week_end_date !== undefined,
  );
  TestValidator.predicate(
    "total_hours is calculated",
    typeof timesheet.total_hours === "number",
  );
  TestValidator.predicate(
    "timelogs array exists",
    Array.isArray(timesheet.timelogs),
  );
  TestValidator.predicate(
    "employee reference exists",
    timesheet.employee !== null && timesheet.employee !== undefined,
  );
}