import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceSessionStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSessionStatus";
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
 * Test customer session status endpoint with expired session token.
 *
 * Validates that the session status endpoint properly rejects requests with expired or invalid authentication tokens. This ensures the authentication system correctly enforces session expiration and prevents unauthorized access to protected endpoints.
 *
 * The test follows these steps:
 *
 * 1. Register a new customer account to obtain valid JWT tokens
 * 2. Create a separate connection with an expired/invalid access token
 * 3. Attempt to retrieve session status with the expired token
 * 4. Verify the system returns 401 Unauthorized error
 *
 * This validates the session expiration handling and ensures expired sessions cannot be used to access protected endpoints.
 */
export async function test_api_customer_session_status_expired_session(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register customer to obtain valid tokens
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(authorized);
  // 2. Create connection with expired/invalid token
  const expiredConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: "Bearer expired_invalid_token_that_will_fail",
    },
  };
  // 3. Attempt to access session status with expired token
  // 4. Validate 401 Unauthorized error is returned
  await TestValidator.httpError(
    "expired session returns 401",
    401,
    async () => {
      await api.functional.ecommerce.customer.session_status.at(
        expiredConnection,
      );
    },
  );
}
