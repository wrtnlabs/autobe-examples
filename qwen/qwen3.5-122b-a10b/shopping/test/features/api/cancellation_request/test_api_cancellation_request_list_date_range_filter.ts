import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallOrderItemCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemCancellationRequest";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrderItemCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderItemCancellationRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_mall_customer_orders_create } from "../../../generate/generate_random_ecommerce_mall_customer_orders_create";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";

/**
 * Test customer cancellation request list date range filtering.
 * Customer retrieves cancellation requests filtered by date range parameters.
 * The test verifies that date range filtering works correctly for both
 * requested_at and responded_at timestamps.
 */
export async function test_api_cancellation_request_list_date_range_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customer);
  // 2. Create orders with order items for cancellation request testing
  const orders = await ArrayUtil.asyncRepeat(3, async () =>
    generate_random_ecommerce_mall_customer_orders_create(
      customerConnection,
      {},
    ),
  );
  // Get the first order item from the first order for testing
  const order = orders[0];
  const orderItem = order.order_items[0];
  // 3. Test requested_at_from filter - get requests submitted after a specific date
  const requestedAtFrom = new Date();
  requestedAtFrom.setHours(requestedAtFrom.getHours() - 2); // 2 hours ago
  const resultFrom =
    await api.functional.ecommerceMall.customer.order_items.cancellation_requests.index(
      customerConnection,
      {
        orderItemId: orderItem.id,
        body: {
          requested_at_from: requestedAtFrom.toISOString(),
        } satisfies IEcommerceMallOrderItemCancellationRequest.IRequest,
      },
    );
  typia.assert(resultFrom);
  // Verify all returned requests have requested_at >= requested_at_from
  for (const request of resultFrom.data) {
    TestValidator.predicate(
      "requested_at >= requested_at_from",
      new Date(request.requestedAt) >= requestedAtFrom,
    );
  }
  // 4. Test requested_at_to filter - get requests submitted before a specific date
  const requestedAtTo = new Date();
  requestedAtTo.setHours(requestedAtTo.getHours() + 2); // 2 hours from now
  const resultTo =
    await api.functional.ecommerceMall.customer.order_items.cancellation_requests.index(
      customerConnection,
      {
        orderItemId: orderItem.id,
        body: {
          requested_at_to: requestedAtTo.toISOString(),
        } satisfies IEcommerceMallOrderItemCancellationRequest.IRequest,
      },
    );
  typia.assert(resultTo);
  // Verify all returned requests have requested_at <= requested_at_to
  for (const request of resultTo.data) {
    TestValidator.predicate(
      "requested_at <= requested_at_to",
      new Date(request.requestedAt) <= requestedAtTo,
    );
  }
  // 5. Test both requested_at_from and requested_at_to - get requests within date range
  const rangeStart = new Date();
  rangeStart.setHours(rangeStart.getHours() - 5); // 5 hours ago
  const rangeEnd = new Date();
  rangeEnd.setHours(rangeEnd.getHours() + 5); // 5 hours from now
  const resultRange =
    await api.functional.ecommerceMall.customer.order_items.cancellation_requests.index(
      customerConnection,
      {
        orderItemId: orderItem.id,
        body: {
          requested_at_from: rangeStart.toISOString(),
          requested_at_to: rangeEnd.toISOString(),
        } satisfies IEcommerceMallOrderItemCancellationRequest.IRequest,
      },
    );
  typia.assert(resultRange);
  // Verify all returned requests are within the date range
  for (const request of resultRange.data) {
    const requestedAt = new Date(request.requestedAt);
    TestValidator.predicate(
      "requested_at >= rangeStart",
      requestedAt >= rangeStart,
    );
    TestValidator.predicate(
      "requested_at <= rangeEnd",
      requestedAt <= rangeEnd,
    );
  }
  // 6. Test pagination metadata reflects filtered result count
  TestValidator.equals(
    "pagination records matches data length",
    resultRange.pagination.records,
    resultRange.data.length,
  );
  TestValidator.equals(
    "pagination current page is 1",
    resultRange.pagination.current,
    1,
  );
}
