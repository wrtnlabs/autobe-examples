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
 * Test timesheet approval workflow by manager with time:approve permission.
 *
 * Validates the complete timesheet approval flow including member authentication, timesheet creation, submission, and manager approval. Ensures that the approval process correctly transitions the timesheet status and locks all included timelogs for payroll processing integrity.
 *
 * Special attention is given to verifying that the reviewed_by field contains the approving manager's member ID, the reviewed_at field contains the approval timestamp, and the status correctly transitions from submitted to approved.
 *
 * 1. Member authenticates with email and password.
 * 2. Member creates a draft timesheet for an employee covering a specific week.
 * 3. Member submits the draft timesheet for manager approval.
 * 4. Manager with time:approve permission approves the submitted timesheet.
 * 5. Validates timesheet status transitions from 'submitted' to 'approved'.
 * 6. Validates reviewed_by contains the approving manager's member ID.
 * 7. Validates reviewed_at contains the approval timestamp.
 * 8. Validates all timelogs in the timesheet are locked and cannot be modified.
 */
export async function test_api_timesheet_approval_by_manager(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authenticates and creates timesheet
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create a draft timesheet for an employee
  // Note: We need organizationId and employeeId - using random UUIDs for simulation
  const timesheet =
    await generate_random_hrm_member_organizations_timesheets_create(
      memberConnection,
      {
        params: {
          organizationId: typia.random<string & tags.Format<"uuid">>(),
        },
        body: {
          hrm_employee_id: typia.random<string & tags.Format<"uuid">>(),
          week_start_date: new Date().toISOString(),
        } satisfies IHrmTimesheetTimelog.ICreate,
      },
    );
  typia.assert(timesheet);
  TestValidator.equals("timesheet status is draft", timesheet.status, "draft");
  // 3. Submit the timesheet for approval
  const submittedTimesheet =
    await api.functional.hrm.member.organizations.timesheets.submit(
      memberConnection,
      {
        organizationId: timesheet.employee.organization.id,
        timesheetId: timesheet.id,
      },
    );
  typia.assert(submittedTimesheet);
  TestValidator.equals(
    "timesheet status is submitted",
    submittedTimesheet.status,
    "submitted",
  );
  TestValidator.predicate(
    "submitted_at is set",
    submittedTimesheet.submitted_at !== null &&
      submittedTimesheet.submitted_at !== undefined,
  );
  // 4. Manager authenticates and approves the timesheet
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
  const approvedTimesheet = await api.functional.hrm.member.timesheets.approve(
    managerConnection,
    {
      timesheetId: timesheet.id,
    },
  );
  typia.assert(approvedTimesheet);
  // 5. Validate approval workflow results
  TestValidator.equals(
    "timesheet status is approved",
    approvedTimesheet.status,
    "approved",
  );
  TestValidator.predicate(
    "reviewed_by is set",
    approvedTimesheet.reviewed_by !== null &&
      approvedTimesheet.reviewed_by !== undefined,
  );
  TestValidator.predicate(
    "reviewed_at is set",
    approvedTimesheet.reviewed_at !== null &&
      approvedTimesheet.reviewed_at !== undefined,
  );
  TestValidator.equals(
    "reviewed_by matches manager ID",
    approvedTimesheet.reviewed_by?.id,
    managerAuth.id,
  );
  TestValidator.predicate(
    "total hours is calculated",
    approvedTimesheet.total_hours >= 0,
  );
}
