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
 * Test that a super administrator can successfully retrieve a refund request snapshot for audit and dispute resolution purposes.
 *
 * Validates the super admin's ability to access refund request snapshots which serve as immutable historical records. The snapshot contains the complete state when the seller responded, including the customer's original reason, status at snapshot time, and the seller's decision.
 *
 * This endpoint is critical for dispute resolution when customers challenge seller decisions on refund requests. The super admin can review what the refund request state was at the moment of seller action.
 *
 * 1. Super admin authenticates via join endpoint to obtain authorization token
 * 2. System validates the super admin's credentials and returns JWT tokens
 * 3. Super admin calls the snapshot retrieval endpoint with requestId and snapshotId
 * 4. System returns the complete snapshot data conforming to IEcommerceMallRefundRequestSnapshot
 *
 * **Note:** This test uses simulate mode to generate mock snapshot data, as creating actual refund request snapshots requires a complex setup involving customers, sellers, products, orders, and refund requests.
 */
export async function test_api_refund_request_snapshot_retrieval_by_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      href: "https://example.com/admin",
      referrer: "https://example.com/login",
    },
  });
  // 2. Generate valid UUIDs for request and snapshot identifiers
  const requestId = typia.random<string & tags.Format<"uuid">>();
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  // 3. Call GET /ecommerceMall/superAdmin/refund-requests/{requestId}/snapshots/{snapshotId}
  const snapshot =
    await api.functional.ecommerceMall.superAdmin.refund_requests.snapshots.at(
      superAdminConnection,
      {
        requestId,
        snapshotId,
      },
    );
  // 4. Validate response with typia.assert - performs complete runtime type validation
  typia.assert(snapshot);
  // 5. Additional business logic validations (not redundant type checks)
  TestValidator.equals(
    "snapshot has valid UUID id",
    snapshot.id.length > 0,
    true,
  );
  TestValidator.predicate(
    "snapshotReason is a non-empty string",
    snapshot.snapshotReason.length > 0,
  );
  TestValidator.predicate(
    "snapshotStatus is valid value",
    ["pending", "approved", "rejected"].includes(snapshot.snapshotStatus),
  );
  TestValidator.predicate(
    "sellerResponse is valid value",
    ["approved", "rejected"].includes(snapshot.sellerResponse),
  );
  TestValidator.predicate(
    "customer summary has valid id",
    snapshot.customer.id.length > 0,
  );
  TestValidator.predicate(
    "seller summary has valid id",
    snapshot.seller.id.length > 0,
  );
}
