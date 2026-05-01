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
import { generate_random_erp_hrm_member_timesheets_create } from "../../../generate/generate_random_erp_hrm_member_timesheets_create";
import { prepare_random_erp_hrm_timesheet } from "../../../prepare/prepare_random_erp_hrm_timesheet";

/**
 * Test that cross-employee timesheet access is denied without proper permissions.
 *
 * Validates that an employee cannot retrieve another employee's timesheet unless
 * they hold the time:view_all permission. The test ensures proper data isolation
 * and access control enforcement at the timesheet detail level.
 *
 * 1. Employee A authenticates and creates a draft timesheet for the current week.
 * 2. Employee B authenticates as a separate, independent member.
 * 3. Employee B attempts to retrieve Employee A's timesheet by its ID.
 * 4. The request is rejected with a 403 Forbidden response, confirming that only
 *    the timesheet owner or users with time:view_all can access another
 *    employee's timesheet.
 */
export async function test_api_timesheet_unauthorized_cross_employee_denied(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as Employee A and create a timesheet
  const employeeAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(employeeAConnection, {});
  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  const timesheet = await generate_random_erp_hrm_member_timesheets_create(
    employeeAConnection,
    { body: { week_start_date: monday.toISOString() } },
  );
  typia.assert(timesheet);
  // Step 2: Authenticate as Employee B
  const employeeBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(employeeBConnection, {});
  // Step 3: Employee B attempts to access Employee A's timesheet
  await TestValidator.httpError(
    "Employee B cannot access Employee A's timesheet without time:view_all permission",
    403,
    async () =>
      await api.functional.erpHrm.member.timesheets.at(employeeBConnection, {
        timesheetId: timesheet.id,
      }),
  );
}
