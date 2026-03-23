import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_mall_customer_cancellation_requests_create } from "../../../generate/generate_random_ecommerce_mall_customer_cancellation_requests_create";
import { prepare_random_ecommerce_mall_cancellation_request } from "../../../prepare/prepare_random_ecommerce_mall_cancellation_request";

export async function test_api_customer_cancellation_request_creation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration and login
  const customerConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email"> & tags.MinLength<1>>() as string & tags.MinLength<1> & tags.Format<"email">,
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(joined);
  // 2. Customer places an order
  const order =
    await api.functional.ecommerceMall.customer.orders.create(
      customerConnection,
    );
  typia.assert(order);
  // Verify order has at least one paid order item
  TestValidator.predicate(
    "order has order items",
    order.order_items.length > 0,
  );
  const paidItem = order.order_items.find(
    (item) => item.item_status === "paid",
  );
  TestValidator.predicate("paid order item exists", paidItem !== undefined);
  if (paidItem === undefined) return;
  // 3. Create cancellation request
  const cancellationRequest =
    await api.functional.ecommerceMall.customer.cancellation_requests.create(
      customerConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 2 }),
          status: "pending",
          order_item_id: paidItem.id,
          seller_id: paidItem.seller.id,
          customer_id: joined.customer.id,
        } satisfies IEcommerceMallCancellationRequest.ICreate,
      },
    );
  typia.assert(cancellationRequest);
  // 4. Validation
  TestValidator.equals(
    "status is pending",
    cancellationRequest.status,
    "pending",
  );
  TestValidator.equals(
    "customer_id matches",
    cancellationRequest.customer.id,
    joined.customer.id,
  );
  TestValidator.equals(
    "seller_id matches",
    cancellationRequest.seller.id,
    paidItem.seller.id,
  );
  TestValidator.equals(
    "order item ID matches",
    cancellationRequest.orderItem.id,
    paidItem.id,
  );
}