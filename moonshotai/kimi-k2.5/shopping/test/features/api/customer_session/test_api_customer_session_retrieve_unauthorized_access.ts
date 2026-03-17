import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_session_retrieve_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Register first customer and capture their session ID
  const firstCustomerConnection: api.IConnection = { host: connection.host };
  const firstCustomer = await authorize_customer_join(firstCustomerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(firstCustomer);
  // 2. Setup: Register second customer to establish different authentication context
  const secondCustomerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(secondCustomerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  // 3. Execution & Validation: Attempt to access first customer's session using second customer's auth
  // Should return 403 Forbidden
  await TestValidator.httpError(
    "should return 403 when accessing another customer's session",
    403,
    async () => {
      await api.functional.ecommerceMall.customer.sessions.at(
        secondCustomerConnection,
        {
          sessionId: firstCustomer.id,
        },
      );
    },
  );
}
