import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
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
import { generate_random_shopping_mall_customer_cancellation_requests_create } from "../../../generate/generate_random_shopping_mall_customer_cancellation_requests_create";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { prepare_random_shopping_mall_cancellation_request } from "../../../prepare/prepare_random_shopping_mall_cancellation_request";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";

export async function test_api_cancellation_request_retrieve_pending_by_customer(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      nickname: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 2. Create an order to obtain order items in PAID status
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {},
  );
  typia.assert(order);
  // 3. Verify order has items and get the first PAID order item
  TestValidator.predicate("order has items", order.items.length > 0);
  const orderItem = order.items[0];
  TestValidator.equals("order item status is PAID", orderItem.status, "PAID");
  // 4. Create a cancellation request for the order item
  const cancellationReason = RandomGenerator.paragraph({ sentences: 2 });
  const cancellationRequest =
    await generate_random_shopping_mall_customer_cancellation_requests_create(
      customerConnection,
      {
        body: {
          order_item_id: orderItem.id,
          reason: cancellationReason,
        } satisfies IShoppingMallCancellationRequest.ICreate,
      },
    );
  typia.assert(cancellationRequest);
  // 5. Retrieve the cancellation request by ID
  const retrievedRequest =
    await api.functional.shoppingMall.customer.cancellation_requests.at(
      customerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
      },
    );
  typia.assert(retrievedRequest);
  // 6. Validate cancellation request details match submitted data
  TestValidator.equals(
    "id matches",
    retrievedRequest.id,
    cancellationRequest.id,
  );
  TestValidator.equals(
    "reason matches",
    retrievedRequest.reason,
    cancellationReason,
  );
  TestValidator.equals("status is PENDING", retrievedRequest.status, "PENDING");
  TestValidator.predicate(
    "requested_at is set",
    retrievedRequest.requested_at !== null,
  );
  TestValidator.equals(
    "responded_at is null",
    retrievedRequest.responded_at,
    null,
  );
  TestValidator.predicate(
    "respondedSeller is null",
    retrievedRequest.respondedSeller === null,
  );
  // 7. Validate order item details in response match original
  TestValidator.equals(
    "order item id matches",
    retrievedRequest.orderItem.id,
    orderItem.id,
  );
  TestValidator.equals(
    "order item quantity matches",
    retrievedRequest.orderItem.quantity,
    orderItem.quantity satisfies number as number,
  );
  TestValidator.equals(
    "order item unitPrice matches",
    retrievedRequest.orderItem.unit_price,
    orderItem.unitPrice satisfies number as number,
  );
  TestValidator.equals(
    "order item status is PAID",
    retrievedRequest.orderItem.status,
    "PAID",
  );
  // 8. Validate customer details in response match authenticated customer
  TestValidator.equals(
    "customer id matches",
    retrievedRequest.customer.id,
    customerAuth.id,
  );
  TestValidator.equals(
    "customer email matches",
    retrievedRequest.customer.email,
    customerAuth.email,
  );
  TestValidator.equals(
    "customer nickname matches",
    retrievedRequest.customer.nickname,
    customerAuth.nickname,
  );
}