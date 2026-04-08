import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackDepartment";
import type { IHrmTimeTrackEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackEmployee";
import type { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import type { IHrmTimeTrackOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackOrganization";
import type { IHrmTimeTrackProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackProject";
import type { IHrmTimeTrackRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRole";
import type { IHrmTimeTrackTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackTask";
import type { IHrmTimeTrackTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackTimelog";
import type { IHrmTimeTrackTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test timesheet submission workflow where an employee submits a draft timesheet for approval.
 *
 * Validates the complete timesheet submission flow including member authentication and status transition from draft to submitted. Ensures that the timesheet correctly transitions to submitted status and that approval-related fields remain null until an approver acts on it.
 *
 * Special attention is given to verifying that the status transition from draft to submitted is successful, the timesheet contains the expected timelogs, and all approval workflow fields (approved_at, rejected_at, rejection_reason, approver) are properly initialized as null for a newly submitted timesheet.
 *
 * 1. Authenticate as a member (employee) to access timesheet operations.
 * 2. Submit a pre-existing draft timesheet by updating its status to 'submitted'.
 * 3. Validate the timesheet status transition and approval workflow fields.
 * 4. Verify the timesheet contains timelogs and employee reference is correct.
 */
export async function test_api_timesheet_submit_draft_for_approval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmTimeTrackMember.IJoin,
  });
  // 2. Generate a draft timesheet ID (assumes pre-existing draft timesheet from test fixtures)
  const draftTimesheetId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Submit the draft timesheet for approval
  const submittedTimesheet =
    await api.functional.hrmTimeTrack.member.timesheets.update(
      memberConnection,
      {
        timesheetId: draftTimesheetId,
        body: {
          status: "submitted",
        } satisfies IHrmTimeTrackTimesheet.IUpdate,
      },
    );
  typia.assert(submittedTimesheet);
  // 4. Validate status transition
  TestValidator.equals(
    "status changed to submitted",
    submittedTimesheet.status,
    "submitted",
  );
  // 5. Validate approval workflow fields are null
  TestValidator.equals(
    "approved_at is null",
    submittedTimesheet.approved_at,
    null,
  );
  TestValidator.equals(
    "rejected_at is null",
    submittedTimesheet.rejected_at,
    null,
  );
  TestValidator.equals(
    "rejection_reason is null",
    submittedTimesheet.rejection_reason,
    null,
  );
  TestValidator.equals("approver is null", submittedTimesheet.approver, null);
  // 6. Validate timesheet has timelogs
  TestValidator.predicate(
    "has timelogs",
    submittedTimesheet.timelogs.length > 0,
  );
  // 7. Validate timesheet week dates are set
  TestValidator.predicate(
    "has week_start_date",
    submittedTimesheet.week_start_date !== null,
  );
  TestValidator.predicate(
    "has week_end_date",
    submittedTimesheet.week_end_date !== null,
  );
  // 8. Validate employee reference exists
  TestValidator.predicate(
    "employee reference exists",
    submittedTimesheet.employee.id !== null,
  );
}
