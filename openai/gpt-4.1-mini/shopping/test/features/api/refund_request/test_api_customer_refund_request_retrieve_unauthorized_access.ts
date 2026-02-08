import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_refund_request_retrieve_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // Register Customer A
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerAAuth = await authorize_customer_join(customerAConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}@test.com`,
      password: "Password123!",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerAAuth);
  customerAConnection.headers = {
    Authorization: `Bearer ${customerAAuth.token.access}`,
  };
  // Register Customer B
  const customerBConnection: api.IConnection = { host: connection.host };
  const customerBAuth = await authorize_customer_join(customerBConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}@test.com`,
      password: "Password123!",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerBAuth);
  customerBConnection.headers = {
    Authorization: `Bearer ${customerBAuth.token.access}`,
  };
  // Simulate Customer A's refund request creation - generate random UUID
  const refundRequestId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >() satisfies string & tags.Format<"uuid"> as string & tags.Format<"uuid">;
  // Customer B attempts to retrieve Customer A's refund request details
  await TestValidator.httpError(
    "Unauthorized retrieval of refund request should be forbidden",
    403,
    async () => {
      await api.functional.shoppingMall.customer.refund_requests.at(
        customerBConnection,
        {
          refundRequestId,
        },
      );
    },
  );
}
