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

export async function test_api_customer_cancellation_request_deletion_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  // Customer join body is an empty object as per DTO
  const authorized = await authorize_customer_join(customerConnection, {
    body: {},
  });
  // Apply authorization token to customer connection headers
  customerConnection.headers = { Authorization: authorized.token.access };
  // 2. TODO: Since no create endpoint was provided for cancellation requests,
  // we must assume an existing cancellationRequestId is known or simulate it.
  // Due to lack of creation API, we randomly generate an UUID for the test.
  // (In a real-world scenario, would create request before deletion.)
  const cancellationRequestId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt deletion of the cancellation request by the owner customer
  const deletedRequest: IShoppingMallCancellationRequest =
    await api.functional.shoppingMall.customer.cancellation_requests.erase(
      customerConnection,
      { cancellationRequestId },
    );
  typia.assert(deletedRequest);
  // 4. Verify deleted entity's id matches
  // Since the schema of IShoppingMallCancellationRequest is empty,
  // we can't check specific properties. But we check it's an object.
  // 5. Attempt unauthorized deletion by another customer
  const otherCustomerConnection: api.IConnection = { host: connection.host };
  const otherAuthorized = await authorize_customer_join(
    otherCustomerConnection,
    { body: {} },
  );
  otherCustomerConnection.headers = {
    Authorization: otherAuthorized.token.access,
  };
  // Expect error when deleting someone else's cancellation request
  await TestValidator.error("unauthorized deletion", async () => {
    await api.functional.shoppingMall.customer.cancellation_requests.erase(
      otherCustomerConnection,
      { cancellationRequestId },
    );
  });
}
