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

export async function test_api_customer_cancellation_request_retrieve_detail(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Fetch cancellation requests detail
  // Prepare authorized customer connection
  const customerConnection: api.IConnection = { host: connection.host };
  const joinOutput = await authorize_customer_join(customerConnection, {
    body: {},
  });
  customerConnection.headers = {
    Authorization: `Bearer ${joinOutput.token.access}`,
  };
  // Scenario 2: Attempt with non-existent cancellationRequestId, expect 404
  const nonExistentUUID = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "404 on non-existent cancellation request",
    404,
    async () => {
      await api.functional.shoppingMall.customer.cancellation_requests.at(
        customerConnection,
        { cancellationRequestId: nonExistentUUID },
      );
    },
  );
  // Scenario 3: Attempt to access without auth, expect 401 or 403
  const unauthenticatedConnection: api.IConnection = { host: connection.host };
  const randomUUID = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "401 or 403 on unauthorized access",
    [401, 403],
    async () => {
      await api.functional.shoppingMall.customer.cancellation_requests.at(
        unauthenticatedConnection,
        { cancellationRequestId: randomUUID },
      );
    },
  );
}
