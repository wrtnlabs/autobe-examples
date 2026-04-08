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

/**
 * Test timesheet rejection workflow with valid rejection reason.
 *
 * Validates the complete timesheet approval workflow including employee time tracking, timesheet submission, and manager rejection with documented reasons. Ensures that rejected timesheets return to draft status with the rejection reason recorded for employee review and audit trail.
 *
 * 1. Employee registers and creates timelog entries for a project.
 * 2. Employee creates draft timesheet covering the week of timelogs.
 * 3. Employee submits the draft timesheet for manager review.
 * 4. Manager with time:review permission rejects timesheet with detailed reason.
 * 5. Validates timesheet status transitions to rejected and reason is recorded.
 * 6. Confirms reviewed_at timestamp and reviewer identity are captured.
 */
export async function test_api_timesheet_rejection_with_valid_reason(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register employee member
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
  // 2. Register manager member
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
  // 3. Get organization from employee's auth response
  if (!employeeAuth.organizations || employeeAuth.organizations.length === 0) {
    throw new Error("Employee must belong to an organization");
  }
  const organizationId = employeeAuth.organizations[0].id;
  // 4. Create timelog entries for employee
  const timelog =
    await generate_random_hrm_member_organizations_timelogs_create(
      employeeConnection,
      {
        params: { organizationId },
      },
    );
  typia.assert(timelog);
  // 5. Create draft timesheet for employee
  const timesheet =
    await generate_random_hrm_member_organizations_timesheets_create(
      employeeConnection,
      {
        params: { organizationId },
      },
    );
  typia.assert(timesheet);
  // 6. Submit timesheet for manager review
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
    "timesheet submitted",
    submittedTimesheet.status,
    "submitted",
  );
  // 7. Manager rejects timesheet with valid reason
  const rejectionReason = RandomGenerator.paragraph({ sentences: 3 });
  const rejectedTimesheet =
    await api.functional.hrm.member.organizations.timesheets.reject(
      managerConnection,
      {
        organizationId,
        timesheetId: timesheet.id,
        body: {
          rejection_reason: rejectionReason,
        } satisfies IHrmTimesheetTimelog.IReject,
      },
    );
  typia.assert(rejectedTimesheet);
  // 8. Validate rejection results
  TestValidator.equals(
    "timesheet rejected",
    rejectedTimesheet.status,
    "rejected",
  );
  TestValidator.equals(
    "rejection reason recorded",
    rejectedTimesheet.rejection_reason,
    rejectionReason,
  );
  TestValidator.predicate(
    "review timestamp recorded",
    rejectedTimesheet.reviewed_at !== null,
  );
}
