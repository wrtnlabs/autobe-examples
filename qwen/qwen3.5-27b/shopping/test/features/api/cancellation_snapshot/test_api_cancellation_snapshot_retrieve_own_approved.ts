import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCancellationSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationSnapshot";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
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
import { generate_random_shopping_mall_customer_cancellation_requests_create } from "../../../generate/generate_random_shopping_mall_customer_cancellation_requests_create";
import { generate_random_shopping_mall_customer_customers_me_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_customers_me_cart_items_create";
import { generate_random_shopping_mall_customer_customers_me_orders_create } from "../../../generate/generate_random_shopping_mall_customer_customers_me_orders_create";
import { prepare_random_shopping_mall_cancellation_request } from "../../../prepare/prepare_random_shopping_mall_cancellation_request";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";

/**
 * Test that a customer can successfully retrieve their own cancellation snapshot after a seller approved their cancellation request.
 *
 * This test validates the complete cancellation snapshot retrieval workflow:
 * 1. Customer registration and authentication
 * 2. Seller registration and authentication
 * 3. Customer creates order with product variant
 * 4. Customer submits cancellation request (status: pending)
 * 5. Seller approves the cancellation request (triggers snapshot creation)
 * 6. Customer retrieves the cancellation snapshot
 * 7. Validates snapshot contains complete audit trail data
 */
export async function test_api_cancellation_snapshot_retrieve_own_approved(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer setup - register and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(customerAuth);
  // 2. Seller setup - register and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      shop_name: RandomGenerator.name(2),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(sellerAuth);
  // 3. Customer adds product variant to cart (assuming pre-existing product)
  const cartItem =
    await generate_random_shopping_mall_customer_customers_me_cart_items_create(
      customerConnection,
      {},
    );
  typia.assert(cartItem);
  // 4. Customer creates order from cart
  const order =
    await generate_random_shopping_mall_customer_customers_me_orders_create(
      customerConnection,
      {},
    );
  typia.assert(order);
  // 5. Customer creates cancellation request for the order item
  const cancellationRequest =
    await generate_random_shopping_mall_customer_cancellation_requests_create(
      customerConnection,
      {
        body: {
          orderItemId: order.orderItems[0].id,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(cancellationRequest);
  TestValidator.equals(
    "cancellation request status is pending",
    cancellationRequest.status,
    "pending",
  );
  // 6. Seller approves the cancellation request (this creates the snapshot)
  const approvedRequest =
    await api.functional.shoppingMall.seller.cancellationRequests.update(
      sellerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
        body: {
          status: "approved",
        } satisfies IShoppingMallCancellationRequest.IUpdate,
      },
    );
  typia.assert(approvedRequest);
  TestValidator.equals(
    "cancellation request approved",
    approvedRequest.status,
    "approved",
  );
  TestValidator.predicate(
    "respondedAt is populated",
    approvedRequest.respondedAt !== null,
  );
  // 7. Retrieve the cancellation snapshot (using cancellation request ID as snapshot ID)
  const snapshot =
    await api.functional.shoppingMall.customer.cancellationSnapshots.at(
      customerConnection,
      {
        cancellationSnapshotId: cancellationRequest.id,
      },
    );
  typia.assert(snapshot);
  // 8. Validate snapshot structure and content
  TestValidator.equals(
    "snapshot references correct cancellation request",
    snapshot.shoppingMallCancellationRequestId,
    cancellationRequest.id,
  );
  // 9. Validate snapshot data contains complete JSON string
  TestValidator.predicate(
    "snapshotData is valid non-empty JSON string",
    typeof snapshot.snapshotData === "string" &&
      snapshot.snapshotData.length > 0,
  );
  // 10. Parse and validate snapshot data content
  const snapshotData = JSON.parse(snapshot.snapshotData);
  TestValidator.predicate(
    "snapshot data is a valid object",
    typeof snapshotData === "object" && snapshotData !== null,
  );
  // 11. Validate snapshot createdAt timestamp is present and valid ISO 8601 format
  TestValidator.predicate(
    "createdAt is valid ISO 8601 timestamp",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(
      snapshot.createdAt,
    ),
  );
  // 12. Validate cancellationRequest object in snapshot
  TestValidator.equals(
    "cancellationRequest status is approved",
    snapshot.cancellationRequest.status,
    "approved",
  );
  TestValidator.predicate(
    "cancellationRequest respondedAt is populated",
    snapshot.cancellationRequest.respondedAt !== null,
  );
  TestValidator.equals(
    "cancellationRequest customer ID matches authenticated customer",
    snapshot.cancellationRequest.customer.id,
    customerAuth.id,
  );
  TestValidator.equals(
    "cancellationRequest reason matches original",
    snapshot.cancellationRequest.reason,
    cancellationRequest.reason,
  );
  // 13. Validate snapshot contains order item reference
  TestValidator.equals(
    "snapshot contains correct order item",
    snapshot.cancellationRequest.orderItem.id,
    order.orderItems[0].id,
  );
  // 14. Validate snapshot immutability - all fields preserved
  TestValidator.equals(
    "snapshot requestedAt matches original",
    snapshot.cancellationRequest.requestedAt,
    cancellationRequest.requestedAt,
  );
  TestValidator.predicate(
    "snapshot seller is populated after approval",
    snapshot.cancellationRequest.seller !== null,
  );
  if (snapshot.cancellationRequest.seller !== null) {
    TestValidator.equals(
      "snapshot seller ID matches approving seller",
      snapshot.cancellationRequest.seller.id,
      sellerAuth.id,
    );
  }
}
