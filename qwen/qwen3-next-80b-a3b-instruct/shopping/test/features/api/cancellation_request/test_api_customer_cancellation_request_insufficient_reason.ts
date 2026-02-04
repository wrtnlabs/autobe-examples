import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_cancellation_request } from "../../../prepare/prepare_random_shopping_mall_cancellation_request";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { generate_random_shopping_mall_customer_cancellation_requests_create } from "../../../generate/generate_random_shopping_mall_customer_cancellation_requests_create";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
export async function test_api_customer_cancellation_request_insufficient_reason(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate as customer
  const customerConnection: api.IConnection = { host: connection.host };
  const authResponse = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(authResponse);
  // Step 2: Create an order with a paid item using customer connection
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {
      body: {
        shippingAddressId: typia.random<string & tags.Format<"uuid">>(),
        paymentMethodToken: "payment-token-123",
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);
  // Step 3: Attempt to create a cancellation request with insufficient reason (9 characters)
  // Business rule: Cancellation reason must be at least 10 characters
  const insufficientReason = "Short 9"; // Exactly 9 characters - insufficient
  await TestValidator.error(
    "cancellation request with insufficient reason length should fail",
    async () => {
      await api.functional.shoppingMall.customer.cancellation_requests.create(
        customerConnection,
        {
          body: {
            reason: insufficientReason,
          } satisfies IShoppingMallCancellationRequest.ICreate,
        },
      );
    },
  );
}
