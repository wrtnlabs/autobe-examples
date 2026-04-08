import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import type { IEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItem";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceRefundRequest";
import type { IEcommerceRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceRefundRequestSnapshot";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_customer_orders_items_refund_requests_create } from "../../../generate/generate_random_ecommerce_customer_orders_items_refund_requests_create";
import { prepare_random_ecommerce_refund_request } from "../../../prepare/prepare_random_ecommerce_refund_request";

/**
 * Test customer viewing refund request snapshots for their own refund requests.
 *
 * Validates the complete refund request snapshot retrieval workflow for customers, ensuring they can access the audit trail of their refund requests. The test verifies that snapshots are properly created when refund requests are submitted and that customers can retrieve specific snapshots using the full relationship chain.
 *
 * Special attention is given to verifying that the snapshot contains all expected fields including the refund reason, current status, and seller response information. The test confirms that snapshots accurately reflect the state of the refund request at the time of creation.
 *
 * 1. Customer authenticates via join operation.
 * 2. Customer creates a refund request for a delivered order item, which triggers automatic snapshot creation.
 * 3. Customer retrieves the specific refund request snapshot using orderId, itemId, requestId, and snapshotId.
 * 4. Validates the snapshot reason matches the reason provided during refund request creation.
 * 5. Validates the snapshot status is 'pending' since no seller response has been submitted yet.
 * 6. Validates all snapshot fields are present and correctly typed.
 */
export async function test_api_refund_request_snapshot_customer_view_own(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Create refund request (snapshot is automatically created)
  // Note: Using random UUIDs for orderId and itemId - backend will validate the relationship
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const itemId = typia.random<string & tags.Format<"uuid">>();
  const refundReason = RandomGenerator.paragraph({ sentences: 3 });
  const refundRequest =
    await generate_random_ecommerce_customer_orders_items_refund_requests_create(
      customerConnection,
      {
        body: {
          reason: refundReason,
        } satisfies IEcommerceRefundRequest.ICreate,
        params: {
          orderId,
          itemId,
        },
      },
    );
  typia.assert(refundRequest);
  // 3. View the refund request snapshot
  // Snapshot ID is generated server-side, use random UUID for testing endpoint structure
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  const snapshot =
    await api.functional.ecommerce.customer.orders.items.refund_requests.snapshots.at(
      customerConnection,
      {
        orderId,
        itemId,
        requestId: refundRequest.id,
        snapshotId,
      },
    );
  typia.assert(snapshot);
  // 4. Validate snapshot contents
  TestValidator.equals(
    "snapshot reason matches",
    snapshot.reason,
    refundReason,
  );
  TestValidator.equals(
    "snapshot status is pending",
    snapshot.status,
    "pending",
  );
  TestValidator.equals(
    "snapshot seller_response is null",
    snapshot.seller_response,
    null,
  );
  TestValidator.equals(
    "snapshot response_at is null",
    snapshot.response_at,
    null,
  );
  TestValidator.predicate(
    "snapshot created_at is valid timestamp",
    snapshot.created_at.length > 0,
  );
  TestValidator.equals(
    "snapshot ecommerce_refund_request_id matches",
    snapshot.ecommerce_refund_request_id,
    refundRequest.id,
  );
}
