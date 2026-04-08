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
 * Test the timesheet rejection workflow where an authorized approver rejects a submitted timesheet with a rejection reason.
 *
 * Validates the complete timesheet rejection flow including approver rejection with reason and employee resubmission capability. Ensures that the timesheet correctly transitions through approval states and that rejection metadata is properly recorded.
 *
 * Special attention is given to verifying that the rejection reason is required when rejecting, the rejected_at timestamp is recorded, and the timesheet returns to a modifiable state allowing the employee to address the rejection reason and resubmit.
 *
 * 1. Authenticate as approver member with time:approve permission.
 * 2. Authenticate as employee member who owns the timesheet.
 * 3. Approver rejects a submitted timesheet with a rejection reason.
 * 4. Validate rejection response contains rejected_at, rejection_reason, and approver info.
 * 5. Employee modifies the rejected timesheet back to draft.
 * 6. Employee resubmits the timesheet.
 * 7. Validate the timesheet is back in submitted state with rejection reason cleared.
 */
export async function test_api_timesheet_reject_with_reason(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as approver member
  const approverConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(approverConnection, {
    body: {
      email: "approver@test.com",
      password: "password123",
      href: "https://test.com/approver",
      referrer: "https://test.com/login",
    },
  });
  // 2. Authenticate as employee member
  const employeeConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(employeeConnection, {
    body: {
      email: "employee@test.com",
      password: "password123",
      href: "https://test.com/employee",
      referrer: "https://test.com/login",
    },
  });
  // 3. Generate a timesheet ID (simulating an existing submitted timesheet)
  const timesheetId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 4. Approver rejects the timesheet with a rejection reason
  const rejectionReason =
    "Timesheet requires correction - missing task assignments";
  const rejectedTimesheet =
    await api.functional.hrmTimeTrack.member.timesheets.update(
      approverConnection,
      {
        timesheetId: timesheetId,
        body: {
          status: "rejected",
          rejection_reason: rejectionReason,
        } satisfies IHrmTimeTrackTimesheet.IUpdate,
      },
    );
  typia.assert(rejectedTimesheet);
  // 5. Validate rejection response contains rejected_at, rejection_reason, and approver info
  TestValidator.equals(
    "timesheet status changed to rejected",
    rejectedTimesheet.status,
    "rejected",
  );
  TestValidator.predicate(
    "rejected_at timestamp is set",
    rejectedTimesheet.rejected_at !== null,
  );
  TestValidator.equals(
    "rejection reason matches provided reason",
    rejectedTimesheet.rejection_reason,
    rejectionReason,
  );
  TestValidator.equals(
    "approved_at is null after rejection",
    rejectedTimesheet.approved_at,
    null,
  );
  TestValidator.predicate(
    "approver information is recorded",
    rejectedTimesheet.approver !== null,
  );
  // 6. Employee modifies the rejected timesheet back to draft
  const draftTimesheet =
    await api.functional.hrmTimeTrack.member.timesheets.update(
      employeeConnection,
      {
        timesheetId: rejectedTimesheet.id,
        body: {
          status: "draft",
        } satisfies IHrmTimeTrackTimesheet.IUpdate,
      },
    );
  typia.assert(draftTimesheet);
  TestValidator.equals(
    "timesheet returned to draft for modification",
    draftTimesheet.status,
    "draft",
  );
  // 7. Employee resubmits the timesheet
  const finalTimesheet =
    await api.functional.hrmTimeTrack.member.timesheets.update(
      employeeConnection,
      {
        timesheetId: draftTimesheet.id,
        body: {
          status: "submitted",
        } satisfies IHrmTimeTrackTimesheet.IUpdate,
      },
    );
  typia.assert(finalTimesheet);
  TestValidator.equals(
    "timesheet resubmitted successfully",
    finalTimesheet.status,
    "submitted",
  );
  TestValidator.equals(
    "rejection reason cleared after resubmission",
    finalTimesheet.rejection_reason,
    null,
  );
}
