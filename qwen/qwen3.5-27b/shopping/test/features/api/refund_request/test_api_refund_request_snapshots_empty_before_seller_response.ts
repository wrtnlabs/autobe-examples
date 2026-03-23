import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallRefundSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRefundSnapshot";
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
import { generate_random_shopping_mall_customer_customers_me_orders_create } from "../../../generate/generate_random_shopping_mall_customer_customers_me_orders_create";
import { generate_random_shopping_mall_customer_refund_requests_create } from "../../../generate/generate_random_shopping_mall_customer_refund_requests_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_refund_request } from "../../../prepare/prepare_random_shopping_mall_refund_request";

/**
 * Test that refund request snapshots return empty paginated result before seller response.
 *
 * This test validates the edge case where a customer queries snapshots for a refund
 * request that has not yet been responded to by the seller. The system should return
 * an empty paginated result (data=[], records=0, pages=0) rather than an error.
 *
 * Test Flow:
 * 1. Register and authenticate a customer
 * 2. Create an order (required for refund eligibility)
 * 3. Create a refund request for an order item
 * 4. Query snapshots for the refund request (before seller response)
 * 5. Verify empty paginated result with correct metadata
 */
export async function test_api_refund_request_snapshots_empty_before_seller_response(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer authentication
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  // 2. Create order (required for refund eligibility)
  const order =
    await generate_random_shopping_mall_customer_customers_me_orders_create(
      customerConnection,
      {},
    );
  typia.assert(order);
  // Get the first order item for refund request
  const orderItem = order.orderItems[0];
  if (!orderItem) {
    throw new Error("Order must have at least one item for refund testing");
  }
  // 3. Create refund request (seller has not responded yet)
  const refundRequest =
    await generate_random_shopping_mall_customer_refund_requests_create(
      customerConnection,
      {
        body: {
          orderItemId: orderItem.id,
          reason: "Product arrived damaged",
        } satisfies IShoppingMallRefundRequest.ICreate,
      },
    );
  typia.assert(refundRequest);
  // Verify refund request is in pending status (no seller response yet)
  TestValidator.equals(
    "refund request status is pending",
    refundRequest.status,
    "pending",
  );
  TestValidator.predicate(
    "refund request has no response timestamp",
    refundRequest.respondedAt === null,
  );
  // 4. Query snapshots for the refund request (before seller response)
  const snapshots =
    await api.functional.shoppingMall.customer.refund_requests.snapshots.index(
      customerConnection,
      {
        refundRequestId: refundRequest.id,
        body: {
          page: 1,
          limit: 20,
        } satisfies IShoppingMallRefundSnapshot.IRequest,
      },
    );
  typia.assert(snapshots);
  // 5. Verify empty paginated result with correct metadata
  TestValidator.equals(
    "snapshots data array is empty",
    snapshots.data.length,
    0,
  );
  TestValidator.equals(
    "pagination current page is 1",
    snapshots.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 20",
    snapshots.pagination.limit,
    20,
  );
  TestValidator.equals(
    "pagination records count is 0",
    snapshots.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages count is 0",
    snapshots.pagination.pages,
    0,
  );
  // 6. Verify response structure conforms to schema (already validated by typia.assert)
  TestValidator.predicate(
    "response has valid pagination object",
    snapshots.pagination !== null && snapshots.pagination !== undefined,
  );
  TestValidator.predicate(
    "response has valid data array",
    Array.isArray(snapshots.data),
  );
}
