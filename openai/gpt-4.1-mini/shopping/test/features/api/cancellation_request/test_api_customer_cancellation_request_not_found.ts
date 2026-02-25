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

export async function test_api_customer_cancellation_request_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Test behavior when trying to retrieve cancellation request details for a non-existent cancellationRequestId.
  // 1. Authenticate a customer using join.
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "test_password_1234",
    },
  });
  customerConnection.headers = {
    Authorization: authorized.token.access,
  };
  // 2. Attempt to get cancellation request details with a random UUID.
  const randomCancellationRequestId = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Confirm that the system responds with a not found error.
  await TestValidator.httpError(
    "retrieving non-existent cancellation request results in 404",
    404,
    async () => {
      await api.functional.shoppingMall.customer.cancellation_requests.at(
        customerConnection,
        { cancellationRequestId: randomCancellationRequestId },
      );
    },
  );
}
