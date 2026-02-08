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

export async function test_api_customer_cancellation_request_deletion_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a new customer
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {},
  });
  customerConnection.headers ??= {};
  customerConnection.headers.Authorization = authorized.token.access;
  // 2. Attempt to delete a non-existent cancellation request with a random UUID
  const nonExistentCancellationRequestId = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.httpError(
    "deletion of non-existent cancellation request returns error",
    404,
    async () => {
      await api.functional.shoppingMall.customer.cancellation_requests.erase(
        customerConnection,
        {
          cancellationRequestId: nonExistentCancellationRequestId,
        },
      );
    },
  );
}
