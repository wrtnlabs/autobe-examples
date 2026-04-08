import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test data integrity enforcement for refund request snapshots.
 *
 * Validates that the system correctly enforces the relationship between refund
 * requests and their snapshots by returning 404 when attempting to access a
 * snapshot that does not belong to the specified refund request.
 *
 * This test ensures data integrity by preventing cross-request snapshot access.
 * When a snapshotId is provided that either doesn't exist or belongs to a
 * different refund request, the system must reject the request with 404.
 *
 * 1. Administrator authenticates via admin join.
 * 2. Two independent random UUIDs are generated (requestId and snapshotId).
 * 3. Endpoint is called with mismatched IDs.
 * 4. System returns 404 - enforcing snapshot-to-request relationship.
 *
 * @param connection - Base API connection
 */
export async function test_api_refund_request_snapshot_mismatched_request(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Generate independent UUIDs for requestId and snapshotId
  // These are guaranteed to be mismatched (different/non-existent)
  const requestId = typia.random<string & tags.Format<"uuid">>();
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to access snapshot with mismatched IDs
  // 4. Validate 404 error is returned
  await TestValidator.httpError(
    "snapshot not found for mismatched request/snapshot IDs",
    404,
    async () =>
      await api.functional.ecommerceMall.admin.refund_requests.snapshots.at(
        adminConnection,
        {
          requestId,
          snapshotId,
        },
      ),
  );
}
