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
 * Test retrieval of a role snapshot permission record that does not exist.
 *
 * Validates that the API properly handles requests for non-existent role snapshot permission records by returning appropriate HTTP 404 Not Found errors. This test ensures the system correctly validates both the snapshot ID and permission ID existence.
 *
 * The test authenticates as a member and attempts to retrieve a permission record using invalid identifiers. Both the snapshotId and permissionId are generated as random UUIDs that do not exist in the database, simulating a request for a completely non-existent resource.
 *
 * 1. Authenticate as a member using the join operation
 * 2. Generate invalid snapshotId and permissionId UUIDs
 * 3. Attempt to retrieve the non-existent permission record
 * 4. Verify the API returns HTTP 404 Not Found error
 */
export async function test_api_role_snapshot_permission_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection);
  // 2. Generate invalid IDs (non-existent snapshot and permission)
  const snapshotId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const permissionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Attempt to retrieve non-existent permission and validate 404 error
  await TestValidator.httpError(
    "returns 404 for non-existent role snapshot permission",
    404,
    async () =>
      await api.functional.hrmTimeTrack.member.role_snapshots.permissions.at(
        memberConnection,
        {
          snapshotId,
          permissionId,
        },
      ),
  );
}
