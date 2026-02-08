import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_orders_items_cancellation_request_create_cancellation_request } from "../../../generate/generate_random_shopping_mall_customer_orders_items_cancellation_request_create_cancellation_request";
import { prepare_random_shopping_mall_cancellation_request } from "../../../prepare/prepare_random_shopping_mall_cancellation_request";

export async function test_api_customer_cancellation_request_creation_and_validation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Successful Cancellation Request Creation
  const customerConnection: api.IConnection = { host: connection.host };
  // Join new customer
  const authorized = await authorize_customer_join(customerConnection, {
    body: {} satisfies IShoppingMallCustomer.IJoin,
  });
  customerConnection.headers = {
    ...customerConnection.headers,
    Authorization: authorized.token.access,
  };
  // Mock orderItemId (UUID string) and cancellation reason
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  const cancellationReason = RandomGenerator.paragraph({ sentences: 3 });
  // Create cancellation request
  const cancellationRequest =
    await generate_random_shopping_mall_customer_orders_items_cancellation_request_create_cancellation_request(
      customerConnection,
      {
        params: { orderItemId },
        body: {
          reason: cancellationReason,
        } satisfies IShoppingMallCancellationRequest.ICreate,
      },
    );
  typia.assert(cancellationRequest);

  // Remove validation of non-existent properties due to schema mismatch
  // 2. Cancellation Request for Non-Owned Order Item
  const otherCustomerConnection: api.IConnection = { host: connection.host };
  const otherAuthorized = await authorize_customer_join(
    otherCustomerConnection,
    {
      body: {} satisfies IShoppingMallCustomer.IJoin,
    },
  );
  otherCustomerConnection.headers = {
    ...otherCustomerConnection.headers,
    Authorization: otherAuthorized.token.access,
  };
  // Try to create cancellation request for some random orderItemId which other user does not own
  const foreignOrderItemId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "Cancellation request for non-owned order item should be forbidden",
    403,
    async () => {
      await generate_random_shopping_mall_customer_orders_items_cancellation_request_create_cancellation_request(
        otherCustomerConnection,
        {
          params: { orderItemId: foreignOrderItemId },
          body: {
            reason: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies IShoppingMallCancellationRequest.ICreate,
        },
      );
    },
  );

  // 3. Cancellation Request with Empty or Missing Reason
  const customerForEmptyReasonConnection: api.IConnection = {
    host: connection.host,
  };
  const authorizedEmpty = await authorize_customer_join(
    customerForEmptyReasonConnection,
    {
      body: {} satisfies IShoppingMallCustomer.IJoin,
    },
  );
  customerForEmptyReasonConnection.headers = {
    ...customerForEmptyReasonConnection.headers,
    Authorization: authorizedEmpty.token.access,
  };
  const someOrderItemId = typia.random<string & tags.Format<"uuid">>();
  // Empty reason
  await TestValidator.error(
    "Cancellation request with empty reason should fail",
    async () => {
      await generate_random_shopping_mall_customer_orders_items_cancellation_request_create_cancellation_request(
        customerForEmptyReasonConnection,
        {
          params: { orderItemId: someOrderItemId },
          body: {
            reason: "",
          } satisfies IShoppingMallCancellationRequest.ICreate,
        },
      );
    },
  );
  // Missing reason (pass an empty object, which is missing reason property)
  // It's impossible to satisfy the type with missing 'reason', but we simulate here
  await TestValidator.error(
    "Cancellation request with missing reason should fail",
    async () => {
      await generate_random_shopping_mall_customer_orders_items_cancellation_request_create_cancellation_request(
        customerForEmptyReasonConnection,
        {
          params: { orderItemId: someOrderItemId },
          body: {},
        },
      );
    },
  );
}
