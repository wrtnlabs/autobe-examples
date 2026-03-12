import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCancellationSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCancellationSnapshot";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCancellationSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationSnapshot";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
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
import { generate_random_shopping_mall_customer_customers_me_orders_create } from "../../../generate/generate_random_shopping_mall_customer_customers_me_orders_create";
import { prepare_random_shopping_mall_cancellation_request } from "../../../prepare/prepare_random_shopping_mall_cancellation_request";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";

/**
 * Test that a customer can retrieve their cancellation request snapshots after a seller has responded to their cancellation request.
 *
 * This test verifies:
 * 1. Customer authentication and order creation workflow
 * 2. Cancellation request creation and seller response triggering snapshot
 * 3. Snapshot retrieval with proper pagination and data structure
 * 4. Snapshot immutability verification
 */
export async function test_api_cancellation_snapshot_customer_retrieval_after_seller_response(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Customer authentication
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Setup: Seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      shop_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 3. Setup: Create order with product from seller
  const order: IShoppingMallOrder =
    await generate_random_shopping_mall_customer_customers_me_orders_create(
      customerConnection,
      {},
    );
  typia.assert(order);
  // Verify order has at least one item
  TestValidator.predicate("order has items", order.orderItems.length > 0);
  // 4. Setup: Create cancellation request for first order item
  const cancellationRequest: IShoppingMallCancellationRequest =
    await generate_random_shopping_mall_customer_cancellation_requests_create(
      customerConnection,
      {
        body: {
          orderItemId: order.orderItems[0].id,
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(cancellationRequest);
  // Verify cancellation request was created
  TestValidator.equals(
    "cancellation request order item matches",
    cancellationRequest.orderItem.id,
    order.orderItems[0].id,
  );
  TestValidator.equals(
    "cancellation request status is pending",
    cancellationRequest.status,
    "pending",
  );
  // 5. Setup: Seller responds to cancellation request (approve)
  const updatedCancellationRequest: IShoppingMallCancellationRequest =
    await api.functional.shoppingMall.seller.cancellationRequests.update(
      sellerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
        body: {
          status: "approved",
        } satisfies IShoppingMallCancellationRequest.IUpdate,
      },
    );
  typia.assert(updatedCancellationRequest);
  // Verify seller response
  TestValidator.equals(
    "cancellation request approved",
    updatedCancellationRequest.status,
    "approved",
  );
  TestValidator.predicate(
    "response timestamp exists",
    updatedCancellationRequest.respondedAt !== null,
  );
  // 6. Test: Customer retrieves cancellation snapshots
  const snapshotsResponse: IPageIShoppingMallCancellationSnapshot.ISummary =
    await api.functional.shoppingMall.customer.cancellationSnapshots.index(
      customerConnection,
      {
        body: {} satisfies IShoppingMallCancellationSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsResponse);
  // 7. Verify pagination structure
  TestValidator.equals(
    "pagination current page",
    snapshotsResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    snapshotsResponse.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "pagination has records",
    snapshotsResponse.pagination.records >= 1,
  );
  TestValidator.predicate(
    "pagination has pages",
    snapshotsResponse.pagination.pages >= 1,
  );
  // 8. Verify snapshots data array
  TestValidator.predicate(
    "snapshots data array not empty",
    snapshotsResponse.data.length >= 1,
  );
  // 9. Verify snapshot structure
  const snapshot = snapshotsResponse.data[0];
  TestValidator.predicate(
    "snapshot id is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      snapshot.id,
    ),
  );
  TestValidator.equals(
    "snapshot cancellation request id matches",
    snapshot.cancellationRequestId,
    cancellationRequest.id,
  );
  TestValidator.predicate(
    "snapshot created at is valid date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      snapshot.createdAt,
    ),
  );
  // 10. Verify snapshot immutability
  const snapshotsResponse2: IPageIShoppingMallCancellationSnapshot.ISummary =
    await api.functional.shoppingMall.customer.cancellationSnapshots.index(
      customerConnection,
      {
        body: {} satisfies IShoppingMallCancellationSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsResponse2);
  const snapshot2 = snapshotsResponse2.data[0];
  TestValidator.equals(
    "snapshot createdAt is immutable",
    snapshot2.createdAt,
    snapshot.createdAt,
  );
  TestValidator.equals("snapshot id is immutable", snapshot2.id, snapshot.id);
}
