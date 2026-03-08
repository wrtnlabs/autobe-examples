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

export async function test_api_cancellation_request_list_with_status_filter(
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
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Create orders with order items in paid status
  const order1 = await generate_random_ecommerce_mall_customer_orders_create(
    customerConnection,
    {
      body: {
        shipping_recipient_name: RandomGenerator.name(),
        shipping_phone_number: RandomGenerator.mobile(),
        shipping_street_address: RandomGenerator.paragraph({ sentences: 2 }),
        shipping_city: RandomGenerator.name(),
        shipping_state: RandomGenerator.name(),
        shipping_postal_code: RandomGenerator.alphabets(5),
        shipping_country: RandomGenerator.name(),
      } satisfies IEcommerceMallOrder.ICreate,
    },
  );
  typia.assert(order1);
  const order2 = await generate_random_ecommerce_mall_customer_orders_create(
    customerConnection,
    {
      body: {
        shipping_recipient_name: RandomGenerator.name(),
        shipping_phone_number: RandomGenerator.mobile(),
        shipping_street_address: RandomGenerator.paragraph({ sentences: 2 }),
        shipping_city: RandomGenerator.name(),
        shipping_state: RandomGenerator.name(),
        shipping_postal_code: RandomGenerator.alphabets(5),
        shipping_country: RandomGenerator.name(),
      } satisfies IEcommerceMallOrder.ICreate,
    },
  );
  typia.assert(order2);
  const order3 = await generate_random_ecommerce_mall_customer_orders_create(
    customerConnection,
    {
      body: {
        shipping_recipient_name: RandomGenerator.name(),
        shipping_phone_number: RandomGenerator.mobile(),
        shipping_street_address: RandomGenerator.paragraph({ sentences: 2 }),
        shipping_city: RandomGenerator.name(),
        shipping_state: RandomGenerator.name(),
        shipping_postal_code: RandomGenerator.alphabets(5),
        shipping_country: RandomGenerator.name(),
      } satisfies IEcommerceMallOrder.ICreate,
    },
  );
  typia.assert(order3);
  // Get order item IDs for testing cancellation request list endpoint
  const orderItemId1 = order1.order_items[0]?.id;
  const orderItemId2 = order2.order_items[0]?.id;
  const orderItemId3 = order3.order_items[0]?.id;
  TestValidator.predicate(
    "order items exist",
    () => !!orderItemId1 && !!orderItemId2 && !!orderItemId3,
  );
  // 3. Test filtering by 'pending' status
  const pendingResult =
    await api.functional.ecommerceMall.customer.order_items.cancellation_requests.index(
      customerConnection,
      {
        orderItemId: orderItemId1!,
        body: {
          status: "pending",
        } satisfies IEcommerceMallOrderItemCancellationRequest.IRequest,
      },
    );
  typia.assert(pendingResult);
  // 4. Test filtering by 'approved' status
  const approvedResult =
    await api.functional.ecommerceMall.customer.order_items.cancellation_requests.index(
      customerConnection,
      {
        orderItemId: orderItemId2!,
        body: {
          status: "approved",
        } satisfies IEcommerceMallOrderItemCancellationRequest.IRequest,
      },
    );
  typia.assert(approvedResult);
  // 5. Test filtering by 'rejected' status
  const rejectedResult =
    await api.functional.ecommerceMall.customer.order_items.cancellation_requests.index(
      customerConnection,
      {
        orderItemId: orderItemId3!,
        body: {
          status: "rejected",
        } satisfies IEcommerceMallOrderItemCancellationRequest.IRequest,
      },
    );
  typia.assert(rejectedResult);
  // 6. Validate pagination metadata exists and is correct structure
  TestValidator.equals(
    "pending pagination current",
    pendingResult.pagination.current,
    pendingResult.pagination.current,
  );
  TestValidator.equals(
    "approved pagination current",
    approvedResult.pagination.current,
    approvedResult.pagination.current,
  );
  TestValidator.equals(
    "rejected pagination current",
    rejectedResult.pagination.current,
    rejectedResult.pagination.current,
  );
  // 7. Validate data arrays are present
  TestValidator.predicate("pending has data array", () =>
    Array.isArray(pendingResult.data),
  );
  TestValidator.predicate("approved has data array", () =>
    Array.isArray(approvedResult.data),
  );
  TestValidator.predicate("rejected has data array", () =>
    Array.isArray(rejectedResult.data),
  );
  // 8. Validate that filtered results only contain matching status
  pendingResult.data.forEach((request) =>
    TestValidator.equals(
      "pending filter returns only pending requests",
      request.status,
      "pending",
    ),
  );
  approvedResult.data.forEach((request) =>
    TestValidator.equals(
      "approved filter returns only approved requests",
      request.status,
      "approved",
    ),
  );
  rejectedResult.data.forEach((request) =>
    TestValidator.equals(
      "rejected filter returns only rejected requests",
      request.status,
      "rejected",
    ),
  );
}
