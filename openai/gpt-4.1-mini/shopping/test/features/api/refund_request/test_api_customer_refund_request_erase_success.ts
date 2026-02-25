import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_refund_request_erase_success(
  connection: api.IConnection,
) {
  // Convert base connection to customer user connection
  const customerConnection: api.IConnection = { host: connection.host };
  // 1. Register new customer (join) and get authorized customer info & authorization tokens
  const authorizedCustomer = await authorize_customer_join(
    customerConnection,
    {},
  );
  typia.assert(authorizedCustomer);
  // Set authorization headers for customerConnection
  customerConnection.headers = {
    Authorization: authorizedCustomer.token.access,
  };
  // 2. Prepare a refund request for deletion by creating one (simulate/prepare internally)
  // Since no create refund request API provided, simulate by random UUID
  // We'll pretend this refundRequestId exists in the system
  // For real scenario, this ID should be created via the refund request creation API
  const refundRequestId = typia.random<string & tags.Format<"uuid">>();
  // As the endpoint does not provide a create API or get API to confirm,
  // we must assume the refund request exists and test the erase endpoint with it.
  // 3. Try deleting the refund request with authorized customer connection
  await api.functional.shoppingMall.customer.refund_requests.erase(
    customerConnection,
    {
      refundRequestId,
    },
  );
  // The endpoint returns void with HTTP 204 No Content, so no response to assert
  // No direct way to verify deletion via get due to unavailability so rely on no error thrown
  // 4. Verify unauthorized user cannot delete refund request
  // Create another connection without auth to attempt erase
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthorized refund request deletion",
    401,
    async () => {
      await api.functional.shoppingMall.customer.refund_requests.erase(
        unauthorizedConnection,
        {
          refundRequestId,
        },
      );
    },
  );
}
