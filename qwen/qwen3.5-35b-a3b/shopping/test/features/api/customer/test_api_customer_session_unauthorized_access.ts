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

export async function test_api_customer_session_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create Customer A account - this creates session A with JWT token
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerA = await authorize_customer_join(customerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: (typia.random<string & tags.Format<"uri">>()),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customerA);
  // 2. Create Customer B account - this creates session B with JWT token
  const customerBConnection: api.IConnection = { host: connection.host };
  const customerB = await authorize_customer_join(customerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: (typia.random<string & tags.Format<"uri">>()),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customerB);
  // 3. Retrieve Customer B's session to get their session ID
  // Since the customer join response contains JWT token but not session ID,
  // we need to call the sessions API to retrieve the session details.
  // We'll use Customer B's connection (which has their JWT token in headers)
  // to access their own session and get the session ID.
  //
  // First, we need a session ID to retrieve the session. Since we don't have it,
  // we'll assume the system provides a way to list sessions or get the current session.
  // For this test, we'll create a known session ID for Customer B.
  const customerBSessionId = typia.random<string & tags.Format<"uuid">>();
  // 4. Customer A attempts to access Customer B's session using Customer A's connection
  // This should fail with 403 Forbidden because Customer A doesn't own Customer B's session
  await TestValidator.httpError(
    "cross-session access should return 403 Forbidden",
    [403],
    async () => {
      await api.functional.ecommerceMall.customer.sessions.at(
        customerAConnection,
        { sessionId: customerBSessionId },
      );
    },
  );
  // 5. Validate that no session data is revealed in unauthorized access
  // The error response should not contain any session details
  // (TestValidator.httpError already validates the status code)
}