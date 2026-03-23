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

export async function test_api_cancellation_request_owner_authorization_boundary(
  connection: api.IConnection,
): Promise<void> {
  // 1. First customer joins and logs in
  const firstCustomerConnection: api.IConnection = { host: connection.host };
  const firstCustomerJoinOutput = await authorize_customer_join(
    firstCustomerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email"> & tags.MinLength<1>>(),
        password: RandomGenerator.alphaNumeric(16),
        name: RandomGenerator.name(),
      } satisfies IEcommerceMallCustomer.IJoin,
    },
  );
  typia.assert(firstCustomerJoinOutput);
  const firstCustomerLoginConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: firstCustomerJoinOutput.token.access },
  };
  const firstCustomerLoginOutput = await authorize_customer_login(
    firstCustomerLoginConnection,
    {
      body: {
        email: firstCustomerJoinOutput.customer.email,
        password: RandomGenerator.alphaNumeric(16),
        href: "",
        referrer: "",
      } satisfies IEcommerceMallCustomer.ILogin,
    },
  );
  typia.assert(firstCustomerLoginOutput);
  // 2. Second customer joins and logs in
  const secondCustomerConnection: api.IConnection = { host: connection.host };
  const secondCustomerJoinOutput = await authorize_customer_join(
    secondCustomerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email"> & tags.MinLength<1>>(),
        password: RandomGenerator.alphaNumeric(16),
        name: RandomGenerator.name(),
      } satisfies IEcommerceMallCustomer.IJoin,
    },
  );
  typia.assert(secondCustomerJoinOutput);
  const secondCustomerLoginConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: secondCustomerJoinOutput.token.access },
  };
  const secondCustomerLoginOutput = await authorize_customer_login(
    secondCustomerLoginConnection,
    {
      body: {
        email: secondCustomerJoinOutput.customer.email,
        password: RandomGenerator.alphaNumeric(16),
        href: "",
        referrer: "",
      } satisfies IEcommerceMallCustomer.ILogin,
    },
  );
  typia.assert(secondCustomerLoginOutput);
  // 3. First customer creates an order
  const firstCustomerOrder =
    await api.functional.ecommerceMall.customer.orders.create(
      firstCustomerLoginConnection,
    );
  typia.assert(firstCustomerOrder);
  // 4. First customer submits a cancellation request
  const firstCustomerCancellationRequest =
    await api.functional.ecommerceMall.customer.cancellation_requests.create(
      firstCustomerLoginConnection,
      {
        body: {
          reason: RandomGenerator.paragraph(),
          status:
            "pending" satisfies IEcommerceMallCancellationRequest.ICreate["status"],
          order_item_id: firstCustomerOrder.order_items[0].id,
          seller_id: firstCustomerOrder.order_items[0].seller.id,
          customer_id: firstCustomerLoginOutput.customer.id,
        } satisfies IEcommerceMallCancellationRequest.ICreate,
      },
    );
  typia.assert(firstCustomerCancellationRequest);
  // 5. Second customer attempts to retrieve the first customer's cancellation request
  // Expected: 403 Forbidden or 404 Not Found
  await TestValidator.error(
    "second customer cannot access first customer's cancellation request",
    async () => {
      await api.functional.ecommerceMall.customer.cancellation_requests.at(
        secondCustomerLoginConnection,
        {
          cancellationRequestId: firstCustomerCancellationRequest.id,
        },
      );
    },
  );
}