import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
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
 * Test that retrieving a non-existent refund request snapshot returns 404.
 *
 * Validates that the super admin endpoint correctly handles requests for
 * refund request snapshots that do not exist. When a super admin attempts
 * to retrieve a snapshot with non-existent requestId or snapshotId UUIDs,
 * the system should return a 404 Not Found error.
 *
 * Steps:
 * 1. Authenticate as super administrator using the join endpoint
 * 2. Generate non-existent UUIDs for requestId and snapshotId
 * 3. Call GET /ecommerceMall/superAdmin/refund-requests/{requestId}/snapshots/{snapshotId}
 * 4. Validate 404 response status and error message
 */
export async function test_api_refund_request_snapshot_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super admin
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // 2. Generate non-existent UUIDs for requestId and snapshotId
  const nonExistentRequestId = typia.random<string & tags.Format<"uuid">>();
  const nonExistentSnapshotId = typia.random<string & tags.Format<"uuid">>();
  // 3. Call the endpoint with non-existent IDs - should return 404
  await TestValidator.httpError(
    "non-existent snapshot returns 404",
    404,
    async () =>
      await api.functional.ecommerceMall.superAdmin.refund_requests.snapshots.at(
        superAdminConnection,
        {
          requestId: nonExistentRequestId,
          snapshotId: nonExistentSnapshotId,
        },
      ),
  );
}
