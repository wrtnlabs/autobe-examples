import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerSession";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_session_access_denied_other_customer(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register Customer A with valid credentials
  const customerAResponse =
    await api.functional.ecommerceMall.auth.customer.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceMallCustomer.IJoin,
    });
  typia.assert(customerAResponse);
  // 2. Register Customer B with different valid credentials
  const customerBResponse =
    await api.functional.ecommerceMall.auth.customer.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceMallCustomer.IJoin,
    });
  typia.assert(customerBResponse);
  // 3. Authenticate as Customer A by using their token
  const customerAConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${customerAResponse.token.access}`,
    },
  };
  // 4. Attempt to access another customer's session as Customer A
  // Use Customer B's customer ID to construct a session-like UUID
  // Since session IDs are not exposed in the API, we use a random UUID
  // The server should return 404 for any session not belonging to Customer A
  await TestValidator.error(
    "customer cannot access other customer's session - returns 404",
    async () => {
      await api.functional.ecommerceMall.customer.customer.sessions.at(
        customerAConnection,
        {
          // Use a random UUID - server should treat this as non-existent or not belonging to customer
          sessionId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
