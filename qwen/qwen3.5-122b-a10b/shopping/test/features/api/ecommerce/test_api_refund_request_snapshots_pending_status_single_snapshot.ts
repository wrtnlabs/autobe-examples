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
 * Test refund request snapshots retrieval for pending status with single snapshot validation.
 *
 * Validates that customers can view snapshots for refund requests in pending status, ensuring the initial snapshot is properly created when a refund request is submitted. The test verifies that pending snapshots correctly contain null values for seller response fields since no seller action has occurred yet.
 *
 * This test focuses on the snapshot system's ability to capture the point-in-time state of a refund request at submission, preserving the customer's original reason and initial pending status in an immutable audit record.
 *
 * 1. Customer authenticates via join operation with randomized credentials
 * 2. Customer calls the snapshot listing endpoint with pre-existing order, item, and refund request IDs
 * 3. Verify response contains exactly one snapshot with status='pending'
 * 4. Verify pending snapshot has seller_response=null and response_at=null
 * 5. Verify snapshot contains the refund reason string
 * 6. Verify pagination shows 1 record total with pages=1
 * 7. Verify snapshot created_at timestamp is present and valid
 */
export async function test_api_refund_request_snapshots_pending_status_single_snapshot(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer authentication
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  // 2. Call snapshot listing endpoint with pre-existing IDs
  const orderId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const itemId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const requestId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const response: IPageIEcommerceRefundRequestSnapshot.ISummary =
    await api.functional.ecommerce.customer.orders.items.refund_requests.snapshots.index(
      customerConnection,
      {
        orderId,
        itemId,
        requestId,
        body: {
          status: "pending",
          limit: 10,
        } satisfies IEcommerceRefundRequestSnapshot.IRequest,
      },
    );
  typia.assert(response);
  // 3. Verify pagination metadata
  TestValidator.equals("pagination records", response.pagination.records, 1);
  TestValidator.equals("pagination pages", response.pagination.pages, 1);
  TestValidator.predicate(
    "data array has one item",
    response.data.length === 1,
  );
  // 4. Verify snapshot content
  const snapshot: IEcommerceRefundRequestSnapshot.ISummary = response.data[0]!;
  typia.assert(snapshot);
  // 5. Verify pending status
  TestValidator.equals(
    "snapshot status is pending",
    snapshot.status,
    "pending",
  );
  // 6. Verify null seller response fields for pending status
  TestValidator.equals(
    "seller_response is null for pending",
    snapshot.seller_response,
    null,
  );
  TestValidator.equals(
    "response_at is null for pending",
    snapshot.response_at,
    null,
  );
  // 7. Verify reason exists
  TestValidator.predicate(
    "reason is non-empty string",
    snapshot.reason.length > 0,
  );
  // 8. Verify created_at timestamp exists
  TestValidator.predicate(
    "created_at is valid ISO timestamp",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(snapshot.created_at),
  );
}
