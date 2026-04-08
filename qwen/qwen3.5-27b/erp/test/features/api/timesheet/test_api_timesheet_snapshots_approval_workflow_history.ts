import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import type { IHrmTimeTrackTimesheetSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackTimesheetSnapshot";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackTimesheetSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackTimesheetSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test retrieving the audit trail of timesheet snapshots from the approval workflow.
 *
 * Validates the snapshots endpoint response structure and pagination metadata for a timesheet's approval history. The test authenticates as a member and retrieves snapshots for a timesheet, verifying that the response contains properly structured snapshot summaries with member references and pagination information.
 *
 * Due to limited API availability (no timesheet creation or approval workflow endpoints), this test uses a generated timesheet ID and focuses on validating the response format rather than the actual workflow history content.
 *
 * 1. Authenticate as a member using the join endpoint.
 * 2. Generate a random UUID to represent an existing timesheet.
 * 3. Call the snapshots endpoint with the timesheet ID.
 * 4. Validate the response contains pagination metadata.
 * 5. Verify each snapshot has required fields: id, status, member reference, created_at.
 * 6. Verify member information includes id, email, created_at, updated_at.
 */
export async function test_api_timesheet_snapshots_approval_workflow_history(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection);
  // 2. Generate a random timesheet ID (simulating an existing timesheet)
  const timesheetId = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve snapshots for the timesheet
  const snapshots =
    await api.functional.hrmTimeTrack.member.timesheets.snapshots.index(
      memberConnection,
      {
        timesheetId,
        body: {} satisfies IHrmTimeTrackTimesheetSnapshot.IRequest,
      },
    );
  typia.assert(snapshots);
  // 4. Validate pagination metadata exists
  TestValidator.predicate(
    "pagination object exists",
    snapshots.pagination !== undefined,
  );
  TestValidator.predicate(
    "pagination has current page",
    snapshots.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has limit",
    snapshots.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination has records count",
    snapshots.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages count",
    snapshots.pagination.pages >= 0,
  );
  // 5. Validate snapshots data array exists
  TestValidator.predicate(
    "snapshots data array exists",
    Array.isArray(snapshots.data),
  );
  // 6. Validate each snapshot structure if data exists
  if (snapshots.data.length > 0) {
    await ArrayUtil.asyncForEach(snapshots.data, (snapshot) => {
      // Validate snapshot has required fields
      TestValidator.predicate(
        `snapshot ${snapshot.id} has UUID`,
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          snapshot.id,
        ),
      );
      TestValidator.predicate(
        `snapshot ${snapshot.id} has status`,
        typeof snapshot.status === "string" && snapshot.status.length > 0,
      );
      TestValidator.predicate(
        `snapshot ${snapshot.id} has created_at`,
        typeof snapshot.created_at === "string" &&
          snapshot.created_at.length > 0,
      );
      // Validate member reference
      TestValidator.predicate(
        `snapshot ${snapshot.id} has member reference`,
        snapshot.member !== undefined,
      );
      TestValidator.predicate(
        `snapshot ${snapshot.id} member has UUID`,
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          snapshot.member.id,
        ),
      );
      TestValidator.predicate(
        `snapshot ${snapshot.id} member has email`,
        typeof snapshot.member.email === "string" &&
          snapshot.member.email.includes("@"),
      );
      TestValidator.predicate(
        `snapshot ${snapshot.id} member has created_at`,
        typeof snapshot.member.created_at === "string" &&
          snapshot.member.created_at.length > 0,
      );
      TestValidator.predicate(
        `snapshot ${snapshot.id} member has updated_at`,
        typeof snapshot.member.updated_at === "string" &&
          snapshot.member.updated_at.length > 0,
      );
      return Promise.resolve();
    });
  }
}
