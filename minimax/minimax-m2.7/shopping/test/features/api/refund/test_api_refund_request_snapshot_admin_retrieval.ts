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
 * Test that an administrator can successfully retrieve a specific refund request snapshot.
 *
 * Validates that an authenticated administrator can access the refund request snapshot retrieval endpoint and receive the complete snapshot data. The snapshot contains immutable historical evidence of the refund request state when the seller responded, including the customer's original reason, status at snapshot time, and seller's response decision.
 *
 * **Access Control Validation:**
 * - Administrators have full access to retrieve any refund request snapshot
 * - Snapshot data is returned with complete customer and seller summary information
 *
 * **Snapshot Data Structure:**
 * The response includes all snapshot fields: id, snapshotReason (customer's original reason), snapshotStatus (status at snapshot time), sellerResponse (approved/rejected), sellerResponseReason (optional rejection reason), customer summary, seller summary, and timestamps.
 *
 * 1. Authenticate as administrator via admin join endpoint.
 * 2. Generate valid UUIDs for requestId and snapshotId parameters.
 * 3. Call GET /ecommerceMall/admin/refund-requests/{requestId}/snapshots/{snapshotId}.
 * 4. Validate response contains all expected snapshot fields with proper types.
 * 5. Validate nested customer and seller summary objects are properly structured.
 */
export async function test_api_refund_request_snapshot_admin_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Generate valid UUIDs for the request
  const requestId = typia.random<string & tags.Format<"uuid">>();
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  // 3. Call the admin refund request snapshot retrieval endpoint
  const snapshot =
    await api.functional.ecommerceMall.admin.refund_requests.snapshots.at(
      adminConnection,
      {
        requestId,
        snapshotId,
      },
    );
  // 4. Validate response with typia.assert()
  typia.assert(snapshot);
}
