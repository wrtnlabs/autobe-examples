import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import type { IHrmTimeTrackRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRole";
import type { IHrmTimeTrackRoleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRoleSnapshot";
import type { IHrmTimeTrackRoleSnapshotPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRoleSnapshotPermission";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test retrieving a role snapshot that does not exist.
 *
 * Validates that the system correctly handles requests for non-existent role snapshot IDs by returning a proper HTTP 404 error. This test ensures graceful error handling when applications reference snapshot IDs that have been deleted, expired, or were never created.
 *
 * Role snapshots are immutable audit records capturing the complete state of a role at a specific point in time. When a snapshot ID doesn't exist in the system, the API should return a clear 404 Not Found error rather than crashing or returning invalid data.
 *
 * 1. Authenticate as a member using the join operation
 * 2. Generate a random UUID that doesn't exist in the database
 * 3. Call GET /hrmTimeTrack/member/role-snapshots/{snapshotId} with the non-existent ID
 * 4. Verify the API throws an HTTP 404 error
 */
export async function test_api_role_snapshot_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection);
  // 2. Generate a non-existent snapshot ID
  const nonExistentSnapshotId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Attempt to retrieve the non-existent snapshot
  await TestValidator.httpError(
    "should return 404 for non-existent snapshot",
    404,
    async () =>
      await api.functional.hrmTimeTrack.member.role_snapshots.at(
        memberConnection,
        {
          snapshotId: nonExistentSnapshotId,
        },
      ),
  );
}
