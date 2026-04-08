import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequestSnapshot";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test that a super administrator receives 404 error when attempting to retrieve a non-existent cancellation request snapshot.
 *
 * Validates that the endpoint properly checks for snapshot existence before returning data. When a super admin attempts to access a snapshot using a valid cancellation request ID but a non-existent snapshot ID, the endpoint should return a 404 Not Found response indicating the snapshot was not found.
 *
 * 1. Super admin authenticates via the join endpoint.
 * 2. A valid cancellation request ID is generated (UUID format).
 * 3. A non-existent snapshot ID is generated (UUID format).
 * 4. GET request is made to the snapshots endpoint with valid requestId but non-existent snapshotId.
 * 5. System returns 404 error confirming proper existence validation.
 */
export async function test_api_cancellation_snapshot_not_found_by_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register super admin account for authentication
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // 2. Generate valid requestId but non-existent snapshotId
  const validRequestId = typia.random<string & tags.Format<"uuid">>();
  const nonExistentSnapshotId = typia.random<string & tags.Format<"uuid">>();
  // 3. Expect 404 error when retrieving non-existent snapshot
  await TestValidator.httpError(
    "snapshot not found returns 404",
    404,
    async () => {
      await api.functional.ecommerceMall.superAdmin.cancellation_requests.snapshots.at(
        superAdminConnection,
        {
          requestId: validRequestId,
          snapshotId: nonExistentSnapshotId,
        },
      );
    },
  );
}
