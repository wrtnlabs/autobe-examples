import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomerSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_session_retrieval_expired_session(
  connection: api.IConnection,
): Promise<void> {
  // Create initial customer connection
  const customerConnection: api.IConnection = { host: connection.host };
  // Generate consistent credentials
  const password = RandomGenerator.alphaNumeric(16);
  // Step 1: Create customer account
  const joinResponse = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: password,
      display_name: RandomGenerator.paragraph({
        sentences: 1,
        wordMin: 2,
        wordMax: 4,
      }).substring(0, 50),
      phone_number: RandomGenerator.mobile(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(joinResponse);
  // Step 2: Login to get session
  const loginResponse = await authorize_customer_login(customerConnection, {
    body: {
      email: joinResponse.email,
      password: password,
    } satisfies IEcommerceCustomer.ILogin,
  });
  typia.assert(loginResponse);
  // For this test scenario, since we cannot simulate session expiration through the API,
  // we'll test with an invalid/non-existent session ID to validate error handling
  const expiredSessionId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Attempt to retrieve non-existent/expired session
  await TestValidator.error("retrieve expired session", async () => {
    await api.functional.ecommerce.customer.sessions.at(customerConnection, {
      sessionId: expiredSessionId,
    });
  });
}
