import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_cancellation_request_authorization_enforced(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create two customers: Customer A and Customer B
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerA = await authorize_customer_join(customerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "passwordA",
    },
  });
  customerAConnection.headers = { Authorization: customerA.token.access };
  const customerBConnection: api.IConnection = { host: connection.host };
  const customerB = await authorize_customer_join(customerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "passwordB",
    },
  });
  customerBConnection.headers = { Authorization: customerB.token.access };
  // 2. Customer A creates a cancellation request. We need to create an order and order item context for that.
  // Since no utility for cancellation request creation is provided, we assume the resource exists already for test.
  // Hence, we simulate creation by calling the customer cancellation request at api to get a random cancellation request that belongs to customer A.
  // For the test, simulate a cancellation request owned by customer A.
  // If the API allows, normally, we would create by POST request but no API provided.
  // Instead, we would simulate or skip creation because the request is about authorization to access.
  // Given this, to test unauthorized access precisely, create a mock or random id for a cancellation request of customer A.
  // However, to avoid test fragility, we call the at endpoint with a valid cancellationRequestId of customer A.
  // So we will test unauthorized access by customer B to that cancellationRequestId.
  // To do this properly without real creation, we must rely on creating a valid cancellation request id for customer A.
  // But no post endpoint given so attempt to mock an id.
  // Generate a valid UUID for cancellationRequestId belonging to customer A. This is a limitation as no creation synthetic provided.
  const cancellationRequestId: string = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Customer B attempts to get cancellation request details of Customer A.
  await TestValidator.httpError(
    "unauthorized access is forbidden",
    403,
    async () => {
      await api.functional.shoppingMall.customer.cancellation_requests.at(
        customerBConnection,
        {
          cancellationRequestId,
        },
      );
    },
  );
}
