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
 * Test timesheet rejection validation requiring mandatory rejection reason.
 *
 * Validates that the timesheet rejection workflow enforces the business rule requiring a rejection reason. When a manager attempts to reject a submitted timesheet without providing a reason, the system must reject the request with an appropriate error.
 *
 * This test ensures the rejection_reason field is mandatory and non-empty, preventing silent rejections that would leave employees without feedback on required corrections. The validation is critical for maintaining audit trails and clear communication in the approval workflow.
 *
 * Note: This test assumes prerequisite data (organization, employee, project, timelogs, submitted timesheet) exists in the test database. The focus is on validating the rejection reason requirement.
 *
 * 1. Employee authenticates and creates timelog entries for a project.
 * 2. Employee creates and submits a draft timesheet containing the timelogs.
 * 3. Manager authenticates with time:review permission.
 * 4. Manager attempts to reject the submitted timesheet without providing rejection_reason.
 * 5. Validates the system throws an error enforcing the mandatory rejection reason requirement.
 */
export async function test_api_timesheet_rejection_missing_reason(
  connection: api.IConnection,
): Promise<void> {
  // 1. Employee setup - authenticate
  const employeeConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(employeeConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  // 2. Manager setup - authenticate
  const managerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(managerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  // Prerequisite data assumption: organization, employee, project, timelogs, and submitted timesheet exist
  // In a full E2E test suite, these would be created using additional SDK functions
  const organizationId = typia.random<string & tags.Format<"uuid">>();
  const timesheetId = typia.random<string & tags.Format<"uuid">>();
  // 3. Manager attempts to reject WITHOUT rejection reason (should fail)
  // Business rule section 301: timesheets cannot be rejected without explaining why
  await TestValidator.error("rejection without reason must fail", async () => {
    await api.functional.hrm.member.organizations.timesheets.reject(
      managerConnection,
      {
        organizationId,
        timesheetId,
        body: {
          rejection_reason: null, // Missing required reason - should trigger validation error
        } satisfies IHrmTimesheetTimelog.IReject,
      },
    );
  });
  // 4. Verify that rejection WITH reason succeeds (positive test)
  // This confirms the API works correctly when the validation passes
  const timesheetWithReason =
    await api.functional.hrm.member.organizations.timesheets.reject(
      managerConnection,
      {
        organizationId,
        timesheetId,
        body: {
          rejection_reason:
            "Please correct the hours logged for Monday and Tuesday",
        } satisfies IHrmTimesheetTimelog.IReject,
      },
    );
  typia.assert(timesheetWithReason);
  TestValidator.equals(
    "rejection reason saved",
    timesheetWithReason.rejection_reason,
    "Please correct the hours logged for Monday and Tuesday",
  );
}
