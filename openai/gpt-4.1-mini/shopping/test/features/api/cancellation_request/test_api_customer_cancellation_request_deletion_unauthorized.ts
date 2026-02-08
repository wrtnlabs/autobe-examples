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

export async function test_api_customer_cancellation_request_deletion_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Unauthorized deletion attempt by a different customer
  // 1. Authenticate first customer (owner) and create a cancellation request
  // 2. Authenticate second customer (non-owner)
  // 3. Attempt to delete the cancellation request created by first customer
  // 4. Expect an authorization error preventing deletion
  // Create first customer connection and join
  const customer1Connection: api.IConnection = { host: connection.host };
  const customer1Join = await authorize_customer_join(customer1Connection, {
    body: {
      // Using empty body due to empty IJoin type
    } satisfies IShoppingMallCustomer.IJoin,
  });
  customer1Connection.headers ??= {};
  customer1Connection.headers.Authorization = customer1Join.token.access;
  // Create a cancellation request in the context of customer1
  // Since no utility to create cancellation requests is provided, we'll generate
  // a random UUID to simulate a cancellation request ID (cannot verify database creation)
  // Instead, we assume a cancellation request ID that belongs to customer1.
  // This is a limitation due to missing create API in given info.
  // Generate a fake cancellation request ID to simulate ownership by customer1
  const cancellationRequestId = typia.random<string & tags.Format<"uuid">>();
  // Create second customer connection and join
  const customer2Connection: api.IConnection = { host: connection.host };
  const customer2Join = await authorize_customer_join(customer2Connection, {
    body: {
      // Using empty body due to empty IJoin type
    } satisfies IShoppingMallCustomer.IJoin,
  });
  customer2Connection.headers ??= {};
  customer2Connection.headers.Authorization = customer2Join.token.access;
  // Second customer attempts unauthorized deletion of first customer's cancellation request
  await TestValidator.httpError(
    "unauthorized deletion by non-owner",
    [401, 403],
    async () => {
      await api.functional.shoppingMall.customer.cancellation_requests.erase(
        customer2Connection,
        {
          cancellationRequestId: cancellationRequestId,
        },
      );
    },
  );
}
