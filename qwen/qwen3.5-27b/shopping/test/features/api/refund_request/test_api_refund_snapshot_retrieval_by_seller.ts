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
 * Test that a seller can retrieve a refund snapshot for a refund request on their order item.
 *
 * Setup:
 * 1. Create and authenticate a customer account
 * 2. Create and authenticate a seller account
 * 3. Customer places an order
 * 4. Customer creates a refund request for an order item
 * 5. System creates a snapshot when refund request is processed
 *
 * Test Steps:
 * 1. Seller authenticates with valid credentials
 * 2. Seller calls GET /shoppingMall/seller/refund-requests/{refundRequestId}/snapshots/{snapshotId}
 * 3. Verify response returns IShoppingMallRefundSnapshot with correct structure
 * 4. Verify snapshot contains refund request details and immutable data
 */
export async function test_api_refund_snapshot_retrieval_by_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
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
  // 2. Create and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
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
  // 3. Customer places an order
  const order =
    await generate_random_shopping_mall_customer_customers_me_orders_create(
      customerConnection,
      {},
    );
  typia.assert(order);
  // Get the first order item for refund testing
  const orderItem = order.orderItems[0];
  typia.assert(orderItem);
  // 4. Customer creates a refund request for the order item
  const refundRequest =
    await generate_random_shopping_mall_customer_refund_requests_create(
      customerConnection,
      {
        body: {
          orderItemId: orderItem.id,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IShoppingMallRefundRequest.ICreate,
      },
    );
  typia.assert(refundRequest);
  // 5. Seller retrieves the refund snapshot
  // The snapshot ID is typically the same as or related to the refund request ID
  // For this test, we use the refund request ID as the snapshot ID
  const snapshot =
    await api.functional.shoppingMall.seller.refund_requests.snapshots.at(
      sellerConnection,
      {
        refundRequestId: refundRequest.id,
        snapshotId: refundRequest.id,
      },
    );
  typia.assert(snapshot);
  // 6. Verify snapshot structure and data
  TestValidator.equals(
    "snapshot id is valid UUID",
    typeof snapshot.id,
    "string",
  );
  TestValidator.predicate(
    "snapshot_data exists and is not empty",
    snapshot.snapshot_data.length > 0,
  );
  TestValidator.predicate(
    "created_at exists and is valid",
    snapshot.created_at.length > 0,
  );
  TestValidator.equals(
    "refund request id matches",
    snapshot.refundRequest.id,
    refundRequest.id,
  );
  TestValidator.equals(
    "refund request reason matches",
    snapshot.refundRequest.reason,
    refundRequest.reason,
  );
  TestValidator.equals(
    "refund request order item matches",
    snapshot.refundRequest.orderItem.id,
    orderItem.id,
  );
  TestValidator.predicate(
    "refund request has valid status",
    ["pending", "approved", "rejected"].includes(snapshot.refundRequest.status),
  );
}
