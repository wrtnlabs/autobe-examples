import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import typia from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { generate_random_shopping_mall_customer_cancellation_requests_create_cancellation_request } from "../../../generate/generate_random_shopping_mall_customer_cancellation_requests_create_cancellation_request";
import { TestValidator } from "@nestia/e2e";

export async function test_api_customer_cancellation_request_creation(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successful creation of a cancellation request by an authenticated customer.
  // 1. Customer registration and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized: IShoppingMallCustomer.IAuthorized =
    await authorize_customer_join(customerConnection, {
      body: typia.random<IShoppingMallCustomer.IJoin>(),
    });
  customerConnection.headers = { Authorization: authorized.token.access };
  // 2. Create a cancellation request with a mocked reason
  const cancellationRequest1: IShoppingMallCancellationRequest =
    await generate_random_shopping_mall_customer_cancellation_requests_create_cancellation_request(
      customerConnection,
      {
        body: {
          reason: "Change of mind",
        },
      },
    );
  typia.assert(cancellationRequest1);

  // Scenario 2: Attempt to create a duplicate cancellation request for the same body content
  await TestValidator.error("duplicate cancellation request", async () => {
    await generate_random_shopping_mall_customer_cancellation_requests_create_cancellation_request(
      customerConnection,
      {
        body: {
          reason: "Duplicate request",
        },
      },
    );
  });

  // Scenario 3: Attempt to create a cancellation request for another customer's order item
  const otherCustomerConnection: api.IConnection = { host: connection.host };
  const otherAuthorized: IShoppingMallCustomer.IAuthorized =
    await authorize_customer_join(otherCustomerConnection, {
      body: typia.random<IShoppingMallCustomer.IJoin>(),
    });
  otherCustomerConnection.headers = {
    Authorization: otherAuthorized.token.access,
  };
  await TestValidator.error(
    "create cancellation request for not owned order item",
    async () => {
      await generate_random_shopping_mall_customer_cancellation_requests_create_cancellation_request(
        otherCustomerConnection,
        {
          body: {
            reason: "Not owner",
          },
        },
      );
    },
  );
}
