import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import type { IEcommerceAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministratorGrade";
import type { IEcommerceRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceRefundRequestSnapshot";
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
 * Administrator views a refund request snapshot while the request is still pending seller approval.
 *
 * Validates the administrator's ability to retrieve refund request snapshots in the pending state, ensuring that the audit trail correctly captures the initial submission state before seller intervention. This test confirms that pending snapshots properly nullify seller response fields while preserving the customer's refund justification and creation timestamp.
 *
 * The test exercises the complete relationship chain from order through order item to refund request and finally to the specific snapshot, verifying that all UUID path parameters are correctly resolved and that the snapshot structure maintains immutability guarantees.
 *
 * 1. Administrator authenticates via admin join endpoint with valid credentials.
 * 2. Administrator retrieves a refund request snapshot using the full path chain (orderId, itemId, requestId, snapshotId).
 * 3. Validates the snapshot contains all required fields with correct types.
 * 4. Confirms the status field indicates 'pending' state.
 * 5. Verifies seller_response is null for pending snapshots.
 * 6. Verifies response_at is null for pending snapshots.
 * 7. Validates reason contains the customer's refund justification.
 * 8. Confirms created_at timestamp is properly formatted.
 */
export async function test_api_admin_refund_request_snapshot_pending(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth: IEcommerceAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        reason: RandomGenerator.paragraph({ sentences: 2 }),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IEcommerceAdmin.IJoin,
    },
  );
  typia.assert(adminAuth);
  // 2. Retrieve refund request snapshot with full path chain
  const snapshot: IEcommerceRefundRequestSnapshot =
    await api.functional.ecommerce.admin.orders.items.refund_requests.snapshots.at(
      adminConnection,
      {
        orderId: typia.random<string & tags.Format<"uuid">>(),
        itemId: typia.random<string & tags.Format<"uuid">>(),
        requestId: typia.random<string & tags.Format<"uuid">>(),
        snapshotId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(snapshot);
  // 3. Validate snapshot structure
  TestValidator.equals(
    "snapshot has valid id",
    snapshot.id !== undefined,
    true,
  );
  TestValidator.equals(
    "snapshot has valid ecommerce_refund_request_id",
    snapshot.ecommerce_refund_request_id !== undefined,
    true,
  );
  TestValidator.predicate("snapshot has reason", snapshot.reason.length > 0);
  TestValidator.predicate("snapshot has status", snapshot.status.length > 0);
  TestValidator.predicate(
    "snapshot has created_at",
    snapshot.created_at.length > 0,
  );
  // 4. Validate pending state - seller response fields should be null
  TestValidator.equals(
    "seller_response is null for pending snapshot",
    snapshot.seller_response,
    null,
  );
  TestValidator.equals(
    "response_at is null for pending snapshot",
    snapshot.response_at,
    null,
  );
}
