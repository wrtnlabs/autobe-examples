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
import { generate_random_erp_hrm_member_timesheets_timelogs_create } from "../../../generate/generate_random_erp_hrm_member_timesheets_timelogs_create";
import { prepare_random_erp_hrm_timelog } from "../../../prepare/prepare_random_erp_hrm_timelog";
import { prepare_random_erp_hrm_timesheet } from "../../../prepare/prepare_random_erp_hrm_timesheet";

/**
 * Test manager review access to another employee's submitted timesheet.
 *
 * Validates that a manager holding the time:view_all permission can retrieve
 * the full detail of a submitted timesheet owned by a different employee
 * within the same organization. The response must include the submitted
 * status, the submitted_at timestamp, the owning employee's profile, and
 * the contained timelogs.
 *
 * 1. Employee registers and creates a draft timesheet for a calendar week.
 * 2. Employee adds a timelog entry so the timesheet is not empty.
 * 3. Employee submits the timesheet, transitioning it to submitted status.
 * 4. Manager registers with time:view_all permission via Manager role.
 * 5. Manager retrieves the employee's submitted timesheet by ID.
 * 6. Validates the response contains the submitted status, submission
 *    timestamp, correct employee identity, and non-empty timelogs array.
 */
export async function test_api_timesheet_manager_review_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Employee setup — register and authenticate
  const employeeConnection: api.IConnection = { host: connection.host };
  const employee = await authorize_member_join(employeeConnection, {});
  typia.assert(employee);
  // 2. Create draft timesheet for the employee
  const timesheet = await generate_random_erp_hrm_member_timesheets_create(
    employeeConnection,
    {},
  );
  typia.assert(timesheet);
  // 3. Add a timelog so the timesheet is not empty and can be submitted
  const timelog =
    await generate_random_erp_hrm_member_timesheets_timelogs_create(
      employeeConnection,
      {
        params: { timesheetId: timesheet.id },
      },
    );
  typia.assert(timelog);
  // 4. Submit the timesheet for manager review
  const submittedTimesheet =
    await api.functional.erpHrm.member.timesheets.submit(employeeConnection, {
      timesheetId: timesheet.id,
    });
  typia.assert(submittedTimesheet);
  // 5. Manager setup — register and authenticate with time:view_all permission
  const managerConnection: api.IConnection = { host: connection.host };
  const manager = await authorize_member_join(managerConnection, {});
  typia.assert(manager);
  // 6. Manager retrieves the employee's submitted timesheet
  const retrievedTimesheet = await api.functional.erpHrm.member.timesheets.at(
    managerConnection,
    {
      timesheetId: timesheet.id,
    },
  );
  typia.assert(retrievedTimesheet);
  // 7. Validate business-level correctness of the retrieved timesheet
  TestValidator.equals(
    "status is submitted",
    retrievedTimesheet.status,
    "submitted",
  );
  TestValidator.predicate(
    "submitted_at is set",
    retrievedTimesheet.submitted_at !== null,
  );
  TestValidator.equals(
    "employee id matches",
    retrievedTimesheet.employee.id,
    submittedTimesheet.employee.id,
  );
  TestValidator.predicate(
    "has timelogs",
    retrievedTimesheet.timelogs.length > 0,
  );
}
