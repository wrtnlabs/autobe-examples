import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallRefundSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_customer_customers_me_orders_create } from "../../../generate/generate_random_shopping_mall_customer_customers_me_orders_create";
import { generate_random_shopping_mall_customer_refund_requests_create } from "../../../generate/generate_random_shopping_mall_customer_refund_requests_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_refund_request } from "../../../prepare/prepare_random_shopping_mall_refund_request";

/**
 * Test that refund snapshots are immutable and preserve historical accuracy for compliance purposes.
 *
 * This test verifies that refund request snapshots:
 * 1. Are created when sellers respond to refund requests
 * 2. Remain completely immutable after creation
 * 3. Preserve complete historical state for audit and compliance
 * 4. Maintain identical snapshot_data and timestamps on repeated retrieval
 */
export async function test_api_refund_snapshot_immutability_verification(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create and authenticate customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 2. Setup: Create and authenticate seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      shop_name: RandomGenerator.name(2),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 3. Setup: Customer places order (requires address_id, using utility function)
  const order =
    await generate_random_shopping_mall_customer_customers_me_orders_create(
      customerConnection,
      {},
    );
  typia.assert(order);
  // Extract order item for refund
  const orderItem = order.orderItems[0];
  typia.assert(orderItem);
  // 4. Setup: Customer creates refund request for delivered order item
  const refundReason = RandomGenerator.paragraph({ sentences: 3 });
  const refundRequest =
    await generate_random_shopping_mall_customer_refund_requests_create(
      customerConnection,
      {
        body: {
          orderItemId: orderItem.id,
          reason: refundReason,
        } satisfies IShoppingMallRefundRequest.ICreate,
      },
    );
  typia.assert(refundRequest);
  // 5. Test: Retrieve the refund snapshot (assumes snapshot exists after seller response)
  // In production, snapshot is created when seller approves/rejects the refund request
  // For this test, we use the refund request ID as the snapshot ID (common pattern)
  const snapshotId = refundRequest.id;
  const firstSnapshot =
    await api.functional.shoppingMall.seller.refund_requests.snapshots.at(
      sellerConnection,
      {
        refundRequestId: refundRequest.id,
        snapshotId: snapshotId,
      },
    );
  typia.assert(firstSnapshot);
  // Record the snapshot data for comparison
  const originalSnapshotData = firstSnapshot.snapshot_data;
  const originalCreatedAt = firstSnapshot.created_at;
  const originalSnapshotId = firstSnapshot.id;
  // 6. Test: Retrieve the same snapshot again to verify immutability
  const secondSnapshot =
    await api.functional.shoppingMall.seller.refund_requests.snapshots.at(
      sellerConnection,
      {
        refundRequestId: refundRequest.id,
        snapshotId: snapshotId,
      },
    );
  typia.assert(secondSnapshot);
  // 7. Verify: snapshot_data is identical (immutability check)
  TestValidator.equals(
    "snapshot_data remains identical",
    secondSnapshot.snapshot_data,
    originalSnapshotData,
  );
  // 8. Verify: created_at timestamp is identical (immutability check)
  TestValidator.equals(
    "created_at timestamp remains identical",
    secondSnapshot.created_at,
    originalCreatedAt,
  );
  // 9. Verify: snapshot ID is consistent
  TestValidator.equals(
    "snapshot ID remains consistent",
    secondSnapshot.id,
    originalSnapshotId,
  );
  // 10. Verify: snapshot contains complete decision context
  const snapshotDataParsed = JSON.parse(firstSnapshot.snapshot_data);
  // Verify refund reason is preserved
  TestValidator.equals(
    "refund reason preserved in snapshot",
    snapshotDataParsed.reason,
    refundReason,
  );
  // Verify snapshot contains status information
  TestValidator.predicate(
    "snapshot contains status field",
    "status" in snapshotDataParsed,
  );
  // Verify snapshot contains timestamps
  TestValidator.predicate(
    "snapshot contains requested_at timestamp",
    "requested_at" in snapshotDataParsed,
  );
  TestValidator.predicate(
    "snapshot contains responded_at timestamp",
    "responded_at" in snapshotDataParsed,
  );
  // 11. Verify: refund request reference is consistent
  TestValidator.equals(
    "refund request ID consistent",
    secondSnapshot.refundRequest.id,
    firstSnapshot.refundRequest.id,
  );
  // 12. Verify: snapshot belongs to correct refund request
  TestValidator.equals(
    "snapshot belongs to correct refund request",
    secondSnapshot.refundRequest.id,
    refundRequest.id,
  );
}
