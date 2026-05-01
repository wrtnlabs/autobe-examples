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
 * Test that a manager with timesheet management permission can soft-delete another employee's draft timesheet.
 *
 * Validates the authorization override path where a manager exercises their timesheet management permission to delete a timesheet they do not own. The employee first creates a draft timesheet, then a separate manager (holding timesheet management permission) deletes it.
 *
 * The test confirms that the cross-user deletion succeeds without error, verifying that the timesheet management permission check in the erase endpoint correctly authorizes users who are not the timesheet's owner but hold the appropriate role.
 *
 * 1. Employee (first member) registers and authenticates via `authorize_member_join`.
 * 2. Employee creates a draft timesheet via `generate_random_erp_hrm_member_timesheets_create`.
 * 3. Manager (second member) registers and authenticates via `authorize_member_join`.
 * 4. Manager deletes the employee's timesheet via `api.functional.erpHrm.member.timesheets.erase`.
 * 5. Validates the employee and manager are distinct users, and the timesheet was in draft status.
 */
export async function test_api_timesheet_erase_by_manager(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as the employee
  const employeeConnection: api.IConnection = { host: connection.host };
  const employee = await authorize_member_join(employeeConnection, {});
  typia.assert(employee);
  // 2. Employee creates a draft timesheet
  const timesheet = await generate_random_erp_hrm_member_timesheets_create(
    employeeConnection,
    {},
  );
  typia.assert(timesheet);
  // 3. Authenticate as the manager
  const managerConnection: api.IConnection = { host: connection.host };
  const manager = await authorize_member_join(managerConnection, {});
  typia.assert(manager);
  // 4. Verify the manager and employee are distinct users
  TestValidator.notEquals(
    "manager is a different user from the employee",
    manager.id,
    employee.id,
  );
  // 5. Verify the timesheet is in draft status before deletion
  TestValidator.equals(
    "timesheet is in draft status before deletion",
    timesheet.status,
    "draft",
  );
  // 6. Manager deletes the employee's timesheet — validates cross-user authorization
  await api.functional.erpHrm.member.timesheets.erase(managerConnection, {
    timesheetId: timesheet.id,
  });
}
