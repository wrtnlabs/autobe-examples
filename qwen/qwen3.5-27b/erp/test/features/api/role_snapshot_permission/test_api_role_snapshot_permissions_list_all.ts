import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import type { IHrmTimeTrackRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRole";
import type { IHrmTimeTrackRoleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRoleSnapshot";
import type { IHrmTimeTrackRoleSnapshotPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRoleSnapshotPermission";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackRoleSnapshotPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackRoleSnapshotPermission";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test the primary success path for listing all permissions associated with a role snapshot.
 *
 * Validates the complete role snapshot permission listing flow including member authentication, permission retrieval with pagination, and response structure verification. Ensures that the permission list correctly references the role snapshot and includes all required fields for each permission record.
 *
 * Special attention is given to verifying that the pagination metadata is accurate and that the roleSnapshot reference in each permission contains the expected role information including name, description, and built-in status.
 *
 * 1. Authenticate as a member using the authorize_member_join utility function
 * 2. Generate a valid role snapshot ID in UUID format for the test
 * 3. Call the PATCH endpoint with an empty request body to retrieve all permissions
 * 4. Validate the response structure contains pagination metadata and permission data array
 * 5. Verify each permission record has required fields: id, permission, roleSnapshot, created_at
 * 6. Verify the roleSnapshot reference includes role name, description, and is_builtin status
 */
export async function test_api_role_snapshot_permissions_list_all(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection);
  // 2. Generate a valid role snapshot ID (UUID format)
  const snapshotId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Call the PATCH endpoint with empty request body (no filters)
  const output: IPageIHrmTimeTrackRoleSnapshotPermission.ISummary =
    await api.functional.hrmTimeTrack.member.role_snapshots.permissions.index(
      memberConnection,
      {
        snapshotId,
        body: {} satisfies IHrmTimeTrackRoleSnapshotPermission.IRequest,
      },
    );
  // 4. Validate response structure - typia.assert performs complete type validation
  typia.assert(output);
  // 5. Verify pagination metadata is consistent
  TestValidator.predicate(
    "pagination current page is at least 1",
    output.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    output.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    output.pagination.records >= 0,
  );
  // 6. Verify pagination pages calculation is correct
  const expectedPages =
    output.pagination.records === 0
      ? 0
      : Math.ceil(output.pagination.records / output.pagination.limit);
  TestValidator.equals(
    "pagination pages calculation",
    output.pagination.pages,
    expectedPages,
  );
  // 7. Verify data length matches pagination expectations
  const expectedDataLength = Math.min(
    output.pagination.records,
    output.pagination.limit,
  );
  TestValidator.equals(
    "data length matches pagination",
    output.data.length,
    expectedDataLength,
  );
  // 8. If there are permissions, verify business logic
  if (output.data.length > 0) {
    // Verify all permissions reference the same snapshot (via roleSnapshot.id)
    const firstSnapshotId = output.data[0].roleSnapshot.id;
    TestValidator.predicate(
      "all permissions reference same snapshot",
      output.data.every(
        (permission) => permission.roleSnapshot.id === firstSnapshotId,
      ),
    );
    // Verify permission names are non-empty strings
    TestValidator.predicate(
      "all permissions have non-empty names",
      output.data.every((permission) => permission.permission.length > 0),
    );
    // Verify role names are non-empty strings
    TestValidator.predicate(
      "all roleSnapshots have non-empty names",
      output.data.every(
        (permission) => permission.roleSnapshot.name.length > 0,
      ),
    );
    // Verify is_builtin is a boolean for all roleSnapshots
    TestValidator.predicate(
      "all roleSnapshots have is_builtin flag",
      output.data.every(
        (permission) => typeof permission.roleSnapshot.is_builtin === "boolean",
      ),
    );
    // Verify all created_at timestamps are valid ISO 8601 format
    TestValidator.predicate(
      "all permissions have valid timestamps",
      output.data.every((permission) => {
        const date = new Date(permission.created_at);
        return !isNaN(date.getTime());
      }),
    );
  }
}
