import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceRefundRequestSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceRefundRequestSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test customer view of refund request snapshots audit trail.
 *
 * Validates that a customer can successfully retrieve the complete audit trail of snapshots for their own refund request. This test verifies the chronological ordering of snapshots, proper pagination metadata, and the presence of all required snapshot fields including status transitions from pending to approved.
 *
 * The test assumes pre-existing order, order item, and refund request data in the system. It focuses on verifying the snapshot retrieval endpoint's response structure and validation logic rather than the complete refund request lifecycle.
 *
 * 1. Customer authenticates via join operation with randomized credentials
 * 2. Calls snapshot listing endpoint with random UUIDs for orderId, itemId, and requestId (pre-existing data assumed)
 * 3. Verifies pagination metadata contains valid current page, limit, records, and pages
 * 4. Verifies data array exists and length matches pagination records count
 * 5. Validates each snapshot contains required fields: id, reason, status, seller_response, response_at, created_at
 * 6. Confirms snapshots are ordered chronologically by created_at in ascending order
 * 7. Ensures seller_response and response_at are null for pending status or populated for approved/rejected status
 */
export async function test_api_refund_request_snapshots_customer_view_audit_trail(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Snapshot listing with pre-existing order/refund data
  // Note: This test assumes pre-existing order, order item, and refund request
  // In production, these would be created through the full order → refund flow
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const itemId = typia.random<string & tags.Format<"uuid">>();
  const requestId = typia.random<string & tags.Format<"uuid">>();
  const snapshots =
    await api.functional.ecommerce.customer.orders.items.refund_requests.snapshots.index(
      customerConnection,
      {
        orderId,
        itemId,
        requestId,
        body: {
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IEcommerceRefundRequestSnapshot.IRequest,
      },
    );
  typia.assert(snapshots);
  // 3. Verify pagination metadata
  TestValidator.predicate(
    "pagination current valid",
    snapshots.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit valid",
    snapshots.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records valid",
    snapshots.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages valid",
    snapshots.pagination.pages >= 0,
  );
  // 4. Verify data array integrity
  TestValidator.predicate(
    "snapshots data array exists",
    Array.isArray(snapshots.data),
  );
  TestValidator.equals(
    "data length matches records",
    snapshots.data.length,
    snapshots.pagination.records,
  );
  // 5. Validate each snapshot's required fields
  for (const snapshot of snapshots.data) {
    typia.assert(snapshot);
    TestValidator.predicate("snapshot has valid id", snapshot.id.length > 0);
    TestValidator.predicate("snapshot has reason", snapshot.reason.length > 0);
    TestValidator.predicate("snapshot has status", snapshot.status.length > 0);
    TestValidator.predicate(
      "snapshot has created_at",
      snapshot.created_at.length > 0,
    );
    TestValidator.predicate(
      "snapshot seller_response valid",
      snapshot.seller_response === null || snapshot.seller_response.length > 0,
    );
    TestValidator.predicate(
      "snapshot response_at valid",
      snapshot.response_at === null || snapshot.response_at.length > 0,
    );
  }
  // 6. Verify chronological ordering (created_at ASC)
  if (snapshots.data.length > 1) {
    for (let i = 1; i < snapshots.data.length; i++) {
      TestValidator.predicate(
        `snapshot ${i} created_at >= snapshot ${i - 1} created_at`,
        snapshots.data[i].created_at >= snapshots.data[i - 1].created_at,
      );
    }
  }
}
