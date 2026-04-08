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

/**
 * Test customer session retrieval with non-existent session ID.
 *
 * Validates that attempting to retrieve a customer session that does not exist returns a proper 404 Not Found error. This test ensures the system handles invalid session lookups gracefully without exposing information about whether a session ID format is valid or not.
 *
 * The test creates a valid customer account, then attempts to query a session with a randomly generated UUID that does not correspond to any existing session in the database. The system must reject this request with a 404 status code.
 *
 * 1. Customer registers with valid credentials to establish authentication.
 * 2. Generate a random UUID that does not exist in the session table.
 * 3. Attempt to retrieve the non-existent session via GET /ecommerce/customer/sessions/{sessionId}.
 * 4. Validate that HttpError with 404 status is thrown.
 * 5. Verify error response does not leak sensitive session information.
 */
export async function test_api_customer_session_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Generate non-existent session ID
  const nonExistentSessionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3-4. Attempt to retrieve non-existent session and validate 404 error
  await TestValidator.httpError(
    "session not found returns 404",
    404,
    async () => {
      await api.functional.ecommerce.customer.sessions.at(customerConnection, {
        sessionId: nonExistentSessionId,
      });
    },
  );
}
