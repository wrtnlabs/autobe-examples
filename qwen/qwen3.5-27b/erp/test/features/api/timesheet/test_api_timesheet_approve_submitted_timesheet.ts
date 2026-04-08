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
 * Test the approval workflow where an authorized approver approves a submitted timesheet.
 *
 * Validates the timesheet approval process by authenticating an approver member and approving a submitted timesheet. Ensures that when an approver approves a submitted timesheet, the status transitions correctly from 'submitted' to 'approved' and all approval metadata is properly recorded including the approved_at timestamp and approver reference.
 *
 * Special attention is given to verifying that the approval response contains the correct status, the approved_at timestamp is set, the approver field contains the approver's member information, and that rejection-related fields are null for approved timesheets.
 *
 * 1. Authenticate as an approver member using the member join endpoint.
 * 2. Use a pre-existing submitted timesheet ID (assumes external setup created the timesheet).
 * 3. Approver approves the submitted timesheet using the update endpoint with status='approved'.
 * 4. Validate the approval response contains status='approved', approved_at timestamp, and approver information.
 * 5. Verify that rejection_reason and rejected_at are null for approved timesheets.
 */
export async function test_api_timesheet_approve_submitted_timesheet(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as approver member
  const approverConnection: api.IConnection = { host: connection.host };
  const approverAuth = await authorize_member_join(approverConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmTimeTrackMember.IJoin,
  });
  typia.assert(approverAuth);
  // 2. Use a pre-existing submitted timesheet ID
  // Note: In a real test environment, this timesheet would be created by external setup
  // or a separate test that creates and submits a timesheet first.
  const timesheetId = typia.random<string & tags.Format<"uuid">>();
  // 3. Approver approves the submitted timesheet
  const approvedTimesheet =
    await api.functional.hrmTimeTrack.member.timesheets.update(
      approverConnection,
      {
        timesheetId,
        body: {
          status: "approved",
        } satisfies IHrmTimeTrackTimesheet.IUpdate,
      },
    );
  typia.assert(approvedTimesheet);
  // 4. Validate approval response
  TestValidator.equals(
    "timesheet status changed to approved",
    approvedTimesheet.status,
    "approved",
  );
  TestValidator.predicate(
    "approved_at is set to current timestamp",
    approvedTimesheet.approved_at !== null,
  );
  TestValidator.predicate(
    "approver field contains approver information",
    approvedTimesheet.approver !== null &&
      approvedTimesheet.approver.id === approverAuth.id,
  );
  // 5. Verify rejection-related fields are null
  TestValidator.equals(
    "rejection_reason is null for approved timesheet",
    approvedTimesheet.rejection_reason,
    null,
  );
  TestValidator.equals(
    "rejected_at is null for approved timesheet",
    approvedTimesheet.rejected_at,
    null,
  );
  // Additional validation: Verify timelogs are included in response
  TestValidator.predicate(
    "timesheet contains timelogs array",
    Array.isArray(approvedTimesheet.timelogs),
  );
  // Additional validation: Verify employee information is present
  TestValidator.predicate(
    "timesheet contains employee information",
    approvedTimesheet.employee.id !== undefined,
  );
  // Additional validation: Verify week dates are set
  TestValidator.predicate(
    "week_start_date is set",
    approvedTimesheet.week_start_date !== undefined,
  );
  TestValidator.predicate(
    "week_end_date is set",
    approvedTimesheet.week_end_date !== undefined,
  );
}
