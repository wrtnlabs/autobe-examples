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
 * Test retrieving an existing role snapshot by its unique identifier.
 *
 * Validates the role snapshot retrieval operation by fetching a snapshot record and verifying its complete structure. Role snapshots are immutable audit records that capture the state of a role at a specific point in time, including name, description, built-in status, permissions, and metadata about which member triggered the snapshot.
 *
 * This test ensures that the snapshot retrieval returns all required fields with correct types and relationships, including the parent role context and optional creator member information.
 *
 * 1. Authenticate as a member to access role snapshot data.
 * 2. Retrieve an existing role snapshot using a valid snapshotId UUID.
 * 3. Validate the response structure contains all required fields.
 * 4. Verify nested relationships (role, member) and permissions array.
 */
export async function test_api_role_snapshot_retrieve_existing(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection);
  // 2. Generate a valid snapshotId UUID for retrieval
  const snapshotId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Retrieve the role snapshot
  const snapshot: IHrmTimeTrackRoleSnapshot =
    await api.functional.hrmTimeTrack.member.role_snapshots.at(
      memberConnection,
      { snapshotId },
    );
  // 4. Validate the response structure (comprehensive type validation)
  typia.assert(snapshot);
  // 5. Verify business logic aspects
  TestValidator.equals("snapshot id matches request", snapshot.id, snapshotId);
  TestValidator.predicate(
    "snapshot has non-empty name",
    snapshot.name.length > 0,
  );
  TestValidator.predicate(
    "role relationship exists",
    snapshot.role.id.length > 0,
  );
  TestValidator.equals(
    "role id is valid UUID format",
    snapshot.role.id.length,
    36,
  );
  // Validate member relationship (nullable - may be null for system-generated snapshots)
  if (snapshot.member !== null) {
    TestValidator.predicate(
      "member has valid email",
      snapshot.member.email.includes("@"),
    );
  }
  // Validate permissions array structure
  TestValidator.predicate(
    "permissions array exists",
    Array.isArray(snapshot.permissions),
  );
  if (snapshot.permissions.length > 0) {
    TestValidator.predicate(
      "first permission has valid id",
      snapshot.permissions[0].id.length > 0,
    );
    TestValidator.predicate(
      "first permission has permission value",
      snapshot.permissions[0].permission.length > 0,
    );
  }
}
