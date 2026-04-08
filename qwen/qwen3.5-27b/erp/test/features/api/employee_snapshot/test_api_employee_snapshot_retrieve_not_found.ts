import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackDepartment";
import type { IHrmTimeTrackEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackEmployee";
import type { IHrmTimeTrackEmployeeSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackEmployeeSnapshot";
import type { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import type { IHrmTimeTrackRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test attempting to retrieve a non-existent employee snapshot by providing an invalid snapshotId.
 *
 * Validates that the employee snapshot retrieval endpoint properly handles requests for snapshots that do not exist in the system. The test authenticates as a member, generates a random UUID that is guaranteed not to exist in the database, and attempts to retrieve the snapshot. The system should respond with a 404 Not Found HTTP error, confirming proper error handling for missing snapshot records.
 *
 * This test ensures that the API correctly distinguishes between valid and invalid snapshot identifiers and provides appropriate error responses for non-existent resources.
 *
 * 1. Authenticate as a member using the authorize_member_join utility function.
 * 2. Generate a random UUID that does not exist in the database.
 * 3. Attempt to retrieve the employee snapshot using the non-existent snapshotId.
 * 4. Validate that the API throws an HttpError with 404 status code.
 */
export async function test_api_employee_snapshot_retrieve_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection);
  // 2. Generate a non-existent snapshotId (random UUID that doesn't exist in DB)
  const nonExistentSnapshotId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Attempt to retrieve non-existent snapshot and validate 404 error
  await TestValidator.httpError(
    "should return 404 for non-existent snapshot",
    404,
    async () =>
      await api.functional.hrmTimeTrack.member.employee_snapshots.at(
        memberConnection,
        {
          snapshotId: nonExistentSnapshotId,
        },
      ),
  );
}
