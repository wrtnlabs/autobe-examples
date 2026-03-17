import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
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

export async function test_api_customer_cancellation_request_retrieve(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer join
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
  // 2. Create cancellation request
  const cancellationRequest =
    await generate_random_ecommerce_mall_customer_cancellation_requests_create(
      customerConnection,
      {},
    );
  typia.assert(cancellationRequest);
  // 3. Retrieve cancellation request
  const retrieved =
    await api.functional.ecommerceMall.customer.cancellation_requests.at(
      customerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
      },
    );
  typia.assert(retrieved);
  // 4. Validate response
  TestValidator.equals("id matches", retrieved.id, cancellationRequest.id);
  TestValidator.equals(
    "status is pending",
    retrieved.status,
    cancellationRequest.status,
  );
  TestValidator.equals(
    "reason matches",
    retrieved.reason,
    cancellationRequest.reason,
  );
  TestValidator.predicate(
    "created_at is valid date-time",
    () => new Date(retrieved.created_at).getTime() > 0,
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    () => new Date(retrieved.updated_at).getTime() > 0,
  );
  TestValidator.equals(
    "order_item_id matches",
    retrieved.order_item_id,
    cancellationRequest.order_item_id,
  );
  TestValidator.equals(
    "seller_id matches",
    retrieved.seller_id,
    cancellationRequest.seller_id,
  );
  TestValidator.equals(
    "customer id matches",
    retrieved.customer.id,
    customer.id,
  );
  TestValidator.equals(
    "order matches",
    retrieved.order_item.order.id,
    cancellationRequest.order_item.order.id,
  );
  TestValidator.equals(
    "product name matches",
    retrieved.order_item.productName,
    cancellationRequest.order_item.productName,
  );
  TestValidator.equals(
    "SKU matches",
    retrieved.order_item.productSku,
    cancellationRequest.order_item.productSku,
  );
  TestValidator.equals(
    "quantity matches",
    retrieved.order_item.quantity,
    cancellationRequest.order_item.quantity,
  );
  TestValidator.equals(
    "unit price matches",
    retrieved.order_item.unitPrice,
    cancellationRequest.order_item.unitPrice,
  );
  TestValidator.equals(
    "total price matches",
    retrieved.order_item.totalPrice,
    cancellationRequest.order_item.totalPrice,
  );
  TestValidator.equals(
    "status matches",
    retrieved.order_item.status,
    cancellationRequest.order_item.status,
  );
  TestValidator.equals(
    "seller id matches",
    retrieved.seller.id,
    cancellationRequest.seller.id,
  );
  TestValidator.equals(
    "seller_response is null",
    retrieved.seller_response,
    cancellationRequest.seller_response,
  );
  TestValidator.equals(
    "deleted_at is null",
    retrieved.deleted_at,
    cancellationRequest.deleted_at,
  );
}