import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_session_details_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Create customer account to establish session
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);
  // Test: authenticated user with invalid session ID returns 404
  // Create an invalid session ID (random UUID)
  const invalidSessionId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "invalid session ID returns 404",
    404,
    async () => {
      await api.functional.shoppingMall.customer.sessions.at(
        customerConnection,
        {
          sessionId: invalidSessionId,
        },
      );
    },
  );
  // Test: unauthenticated attempt returns 401
  // Create a new connection without any token
  const unauthenticatedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthenticated access returns 401",
    401,
    async () => {
      await api.functional.shoppingMall.customer.sessions.at(
        unauthenticatedConnection,
        {
          sessionId: invalidSessionId,
        },
      );
    },
  );
}
