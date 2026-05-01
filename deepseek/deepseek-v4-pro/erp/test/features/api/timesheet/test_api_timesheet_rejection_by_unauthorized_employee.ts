import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
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
import { generate_random_erp_hrm_member_timesheets_timelogs_create } from "../../../generate/generate_random_erp_hrm_member_timesheets_timelogs_create";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_timelog } from "../../../prepare/prepare_random_erp_hrm_timelog";
import { prepare_random_erp_hrm_timesheet } from "../../../prepare/prepare_random_erp_hrm_timesheet";

/**
 * Test that an employee who owns a submitted timesheet but lacks the time:approve permission cannot reject their own timesheet.
 *
 * Validates the authorization boundary enforced by the timesheet rejection endpoint. A regular employee who owns a submitted timesheet attempts to reject it — an action reserved for users with the time:approve permission (managers and organization owners). The system must return a 403 Forbidden response, preventing the employee from bypassing the approval workflow.
 *
 * The timesheet must remain in submitted status after the failed rejection attempt, and no review metadata (reviewed_at, reviewedByUser, rejection_reason) should be written to the timesheet record.
 *
 * 1. Employee registers and authenticates via authorize_member_join.
 * 2. Employee creates an active project for time tracking.
 * 3. Employee creates a draft timesheet for the Monday April 27, 2026 week.
 * 4. Employee adds a timelog dated April 28, 2026 against the created project.
 * 5. Employee submits the timesheet, transitioning it to submitted status.
 * 6. Employee attempts to reject the submitted timesheet — expects 403 Forbidden.
 */
export async function test_api_timesheet_rejection_by_unauthorized_employee(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as employee
  const employeeConnection: api.IConnection = { host: connection.host };
  const employee = await authorize_member_join(employeeConnection, {});
  typia.assert(employee);
  // 2. Create an active project for time tracking
  const project = await generate_random_erp_hrm_member_projects_create(
    employeeConnection,
    {},
  );
  typia.assert(project);
  // 3. Create a draft timesheet for the Monday April 27, 2026 week
  const timesheet = await generate_random_erp_hrm_member_timesheets_create(
    employeeConnection,
    {
      body: {
        week_start_date: "2026-04-27T00:00:00.000Z",
      },
    },
  );
  typia.assert(timesheet);
  // 4. Add a timelog within the timesheet's week range
  const timelog =
    await generate_random_erp_hrm_member_timesheets_timelogs_create(
      employeeConnection,
      {
        body: {
          project_id: project.id,
          date: "2026-04-28",
        },
        params: {
          timesheetId: timesheet.id,
        },
      },
    );
  typia.assert(timelog);
  // 5. Submit the timesheet
  const submitted = await api.functional.erpHrm.member.timesheets.submit(
    employeeConnection,
    {
      timesheetId: timesheet.id,
    },
  );
  typia.assert(submitted);
  // 6. Employee without time:approve permission attempts to reject → 403
  await TestValidator.httpError(
    "employee without time:approve permission cannot reject own timesheet",
    403,
    async () =>
      await api.functional.erpHrm.member.timesheets.reject(employeeConnection, {
        timesheetId: timesheet.id,
        body: {
          rejection_reason: "Rejecting my own submitted timesheet",
        } satisfies IErpHrmTimesheet.IReject,
      }),
  );
}
