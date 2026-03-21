import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
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
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { generate_random_erp_hrm_member_timesheets_create } from "../../../generate/generate_random_erp_hrm_member_timesheets_create";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_timesheet } from "../../../prepare/prepare_random_erp_hrm_timesheet";

/**
 * Test timesheet creation for a week where the employee has no recorded timelogs.
 * Validates that the system allows creating a timesheet even when no time has been logged.
 */
export async function test_api_timesheet_create_empty_week(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member via join operation
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create a project within the organization
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // 3. Create a timesheet for an empty week (Monday)
  // Calculate the previous Monday (or today if today is Monday)
  const now = new Date();
  const dayOfWeek = now.getDay();
  // For Sunday (0), we need to go back 6 days; for Monday (1), go back 0 days, etc.
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - daysToMonday);
  monday.setHours(0, 0, 0, 0);
  const weekStartDate = monday.toISOString();
  const timesheet = await api.functional.erpHrm.member.timesheets.create(
    memberConnection,
    {
      body: {
        week_start_date: weekStartDate,
      } satisfies IErpHrmTimesheet.ICreate,
    },
  );
  typia.assert(timesheet);
  // 4. Validate the timesheet properties
  TestValidator.equals("timesheet status is draft", timesheet.status, "draft");
  TestValidator.equals("total hours is 0", timesheet.total_hours, 0);
  TestValidator.predicate(
    "timelogs array is empty",
    timesheet.timelogs.length === 0,
  );
  // Compare dates by parsing and comparing the date portion
  const responseStartDate = new Date(timesheet.week_start_date);
  const expectedStartDate = new Date(weekStartDate);
  TestValidator.predicate(
    "week start date matches",
    responseStartDate.getTime() === expectedStartDate.getTime(),
  );
  // Verify week_end_date is week_start_date + 6 days (Sunday)
  const expectedEndDate = new Date(monday);
  expectedEndDate.setDate(monday.getDate() + 6);
  const responseEndDate = new Date(timesheet.week_end_date);
  TestValidator.predicate(
    "week end date is following Sunday",
    responseEndDate.getTime() === expectedEndDate.getTime(),
  );
  // Verify employee information matches the authenticated user
  TestValidator.equals(
    "employee member id matches authenticated user",
    timesheet.employee.member.id,
    member.id,
  );
  TestValidator.equals(
    "employee member email matches authenticated user",
    timesheet.employee.member.email,
    member.email,
  );
}
