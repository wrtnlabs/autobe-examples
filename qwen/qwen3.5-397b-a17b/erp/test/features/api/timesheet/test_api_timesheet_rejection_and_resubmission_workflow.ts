import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import type { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
import type { IHrmPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_timelogs_create } from "../../../generate/generate_random_hrm_platform_member_timelogs_create";
import { generate_random_hrm_platform_member_timesheets_create } from "../../../generate/generate_random_hrm_platform_member_timesheets_create";
import { prepare_random_hrm_platform_timelog } from "../../../prepare/prepare_random_hrm_platform_timelog";
import { prepare_random_hrm_platform_timesheet } from "../../../prepare/prepare_random_hrm_platform_timesheet";

/**
 * Test the complete workflow of timesheet rejection followed by employee resubmission.
 *
 * Validates the full timesheet approval lifecycle including initial submission, rejection with reason, employee correction, and resubmission. Ensures that rejected timesheets properly return to draft status allowing employees to make corrections and resubmit for approval.
 *
 * The test verifies that rejection reasons are properly stored and visible to employees, providing transparency for required corrections. The workflow demonstrates that timesheets can cycle through multiple approval attempts.
 *
 * 1. Create employee and approver member accounts with authentication.
 * 2. Employee creates timelog entries for the week period.
 * 3. Employee creates draft timesheet and submits for approval.
 * 4. Approver rejects timesheet with detailed rejection reason.
 * 5. Verify timesheet status changes to rejected with reason stored.
 * 6. Employee creates new timelog as correction.
 * 7. Employee resubmits the timesheet.
 * 8. Verify timesheet transitions back to submitted status.
 */
export async function test_api_timesheet_rejection_and_resubmission_workflow(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create employee member account
  const employeeConnection: api.IConnection = { host: connection.host };
  const employeeAuth = await authorize_member_join(employeeConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(employeeAuth);
  // 2. Create approver member account (with time:approve permission)
  const approverConnection: api.IConnection = { host: connection.host };
  const approverAuth = await authorize_member_join(approverConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(approverAuth);
  // 3. Employee creates timelog entry for the week
  const timelog =
    await generate_random_hrm_platform_member_timelogs_create(
      employeeConnection,
      {},
    );
  typia.assert(timelog);
  // 4. Employee creates draft timesheet for the week
  const timesheet =
    await generate_random_hrm_platform_member_timesheets_create(
      employeeConnection,
      {},
    );
  typia.assert(timesheet);
  // 5. Employee submits the timesheet for approval
  const submittedTimesheet =
    await api.functional.hrmPlatform.member.timesheets.submit(
      employeeConnection,
      {
        timesheetId: timesheet.id,
      },
    );
  typia.assert(submittedTimesheet);
  // Verify timesheet is in submitted status
  TestValidator.equals(
    "timesheet status after submission",
    submittedTimesheet.status,
    "submitted",
  );
  // 6. Approver rejects the submitted timesheet with reason
  const rejectionReason = RandomGenerator.paragraph({ sentences: 2 });
  const rejectedTimesheet =
    await api.functional.hrmPlatform.member.timesheets.reject(
      approverConnection,
      {
        timesheetId: submittedTimesheet.id,
        body: {
          rejection_reason: rejectionReason,
        } satisfies IHrmPlatformTimesheet.IReject,
      },
    );
  typia.assert(rejectedTimesheet);
  // 7. Verify timesheet status changed to rejected
  TestValidator.equals(
    "timesheet status after rejection",
    rejectedTimesheet.status,
    "rejected",
  );
  // 8. Verify rejection reason is stored and visible
  TestValidator.equals(
    "rejection reason matches",
    rejectedTimesheet.rejectionReason,
    rejectionReason,
  );
  // 9. Verify reviewer is set to approver
  TestValidator.predicate(
    "reviewer is set",
    rejectedTimesheet.reviewer !== null &&
      rejectedTimesheet.reviewer !== undefined,
  );
  // 10. Employee creates additional timelog as correction
  const additionalTimelog =
    await generate_random_hrm_platform_member_timelogs_create(
      employeeConnection,
      {},
    );
  typia.assert(additionalTimelog);
  // 11. Employee resubmits the timesheet after corrections
  const resubmittedTimesheet =
    await api.functional.hrmPlatform.member.timesheets.submit(
      employeeConnection,
      {
        timesheetId: rejectedTimesheet.id,
      },
    );
  typia.assert(resubmittedTimesheet);
  // 12. Verify timesheet transitions back to submitted status
  TestValidator.equals(
    "timesheet status after resubmission",
    resubmittedTimesheet.status,
    "submitted",
  );
  // 13. Verify the timesheet can be rejected again (completing the cycle)
  const secondRejectionReason = RandomGenerator.paragraph({ sentences: 2 });
  const secondRejectedTimesheet =
    await api.functional.hrmPlatform.member.timesheets.reject(
      approverConnection,
      {
        timesheetId: resubmittedTimesheet.id,
        body: {
          rejection_reason: secondRejectionReason,
        } satisfies IHrmPlatformTimesheet.IReject,
      },
    );
  typia.assert(secondRejectedTimesheet);
  // 14. Verify second rejection was successful
  TestValidator.equals(
    "timesheet status after second rejection",
    secondRejectedTimesheet.status,
    "rejected",
  );
  TestValidator.equals(
    "second rejection reason matches",
    secondRejectedTimesheet.rejectionReason,
    secondRejectionReason,
  );
  // 15. Verify rejection reason was updated
  TestValidator.notEquals(
    "rejection reason updated",
    secondRejectedTimesheet.rejectionReason,
    rejectedTimesheet.rejectionReason,
  );
}