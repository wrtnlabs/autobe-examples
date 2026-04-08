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
 * Test successful retrieval of a role snapshot permission record.
 *
 * Validates that an authenticated member can retrieve a specific permission record from a role snapshot. The test verifies the complete permission record structure including the permission identifier, role snapshot reference, and creation timestamp.
 *
 * This test ensures that role snapshot permissions are properly stored and retrievable for audit trail purposes. Each permission record is immutable and captures the exact permission state at a specific point in time.
 *
 * 1. Authenticate as a member using the join operation
 * 2. Retrieve a specific role snapshot permission record using valid snapshotId and permissionId
 * 3. Validate the response contains all required fields with correct types
 * 4. Verify the nested roleSnapshot structure includes role and createdByMember references
 */
export async function test_api_role_snapshot_permission_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection);
  // 2. Generate valid UUIDs for snapshotId and permissionId
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  const permissionId = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve the role snapshot permission record
  const permission =
    await api.functional.hrmTimeTrack.member.role_snapshots.permissions.at(
      memberConnection,
      {
        snapshotId,
        permissionId,
      },
    );
  typia.assert(permission);
  // 4. Validate the permission record was retrieved with correct ID
  TestValidator.equals(
    "permission id matches request",
    permission.id,
    permissionId,
  );
  // 5. Validate permission field contains a valid permission identifier
  TestValidator.predicate("permission identifier is not empty", () => {
    return permission.permission.length > 0;
  });
  // 6. Validate roleSnapshot contains required role information
  TestValidator.predicate("roleSnapshot has valid role reference", () => {
    return (
      permission.roleSnapshot.role.id.length > 0 &&
      permission.roleSnapshot.role.name.length > 0
    );
  });
  // 7. Validate createdByMember if present
  const createdByMember = permission.roleSnapshot.createdByMember;
  if (createdByMember != null) {
    TestValidator.predicate("createdByMember has valid identity", () => {
      return (
        createdByMember.id.length > 0 &&
        createdByMember.email.length > 0
      );
    });
  }
  // 8. Validate timestamps are present
  TestValidator.predicate("roleSnapshot has creation timestamp", () => {
    return permission.roleSnapshot.created_at.length > 0;
  });
  TestValidator.predicate("permission has creation timestamp", () => {
    return permission.created_at.length > 0;
  });
}