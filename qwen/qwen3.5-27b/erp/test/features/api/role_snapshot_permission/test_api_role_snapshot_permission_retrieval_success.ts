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
 * Validates the complete role snapshot permission retrieval flow including member authentication and permission record access. Ensures that the returned permission record contains all expected fields including the permission identifier, role snapshot reference with complete metadata, and creation timestamp.
 *
 * Special attention is given to verifying that the role snapshot reference includes the parent role information and the member who created the snapshot, confirming that the immutable audit record is properly maintained for compliance purposes.
 *
 * 1. Member authenticates via join endpoint.
 * 2. Retrieves a role snapshot permission using valid snapshotId and permissionId.
 * 3. Validates the complete response structure using typia.assert().
 */
export async function test_api_role_snapshot_permission_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmTimeTrackMember.IJoin,
  });
  // 2. Retrieve role snapshot permission
  const permission =
    await api.functional.hrmTimeTrack.member.role_snapshots.permissions.at(
      memberConnection,
      {
        snapshotId: typia.random<string & tags.Format<"uuid">>(),
        permissionId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(permission);
}
