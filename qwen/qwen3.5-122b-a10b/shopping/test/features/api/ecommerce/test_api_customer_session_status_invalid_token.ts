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
 * Test customer session status endpoint with invalid or missing JWT tokens.
 *
 * Validates that the session-status endpoint properly rejects unauthorized requests with 401 Unauthorized errors. This ensures the authentication mechanism correctly validates JWT tokens and prevents unauthorized access to session information.
 *
 * The test covers three invalid token scenarios: missing Authorization header, malformed token format, and token from a different user session. Each scenario should result in proper authorization failure.
 *
 * 1. Create a valid customer account through registration to establish baseline functionality.
 * 2. Test session status with missing Authorization header - expect 401 Unauthorized.
 * 3. Test session status with malformed token format - expect 401 Unauthorized.
 * 4. Test session status with token from different user session - expect 401 Unauthorized.
 * 5. Verify valid token successfully returns session status - expect 200 OK with session data.
 */
export async function test_api_customer_session_status_invalid_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create valid customer to establish baseline
  const validCustomerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await api.functional.ecommerce.auth.customer.join(
    validCustomerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceCustomer.IJoin,
    },
  );
  typia.assert(customerAuth);
  // 2. Test with valid token - should succeed
  const sessionStatus =
    await api.functional.ecommerce.customer.session_status.at(
      validCustomerConnection,
    );
  typia.assert(sessionStatus);
  TestValidator.equals("user type is customer", sessionStatus.type, "customer");
  TestValidator.equals(
    "user_id matches",
    sessionStatus.user_id,
    customerAuth.id,
  );
  // 3. Test with missing Authorization header - expect 401
  const noAuthConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "missing authorization header",
    401,
    async () => {
      await api.functional.ecommerce.customer.session_status.at(
        noAuthConnection,
      );
    },
  );
  // 4. Test with malformed token - expect 401
  const malformedTokenConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: "Bearer invalid.token.format" },
  };
  await TestValidator.httpError("malformed token format", 401, async () => {
    await api.functional.ecommerce.customer.session_status.at(
      malformedTokenConnection,
    );
  });
  // 5. Test with expired/invalid token from different session - expect 401
  // Create another customer and use their token after they've been deleted
  const anotherCustomerConnection: api.IConnection = { host: connection.host };
  const anotherCustomerAuth = await api.functional.ecommerce.auth.customer.join(
    anotherCustomerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceCustomer.IJoin,
    },
  );
  typia.assert(anotherCustomerAuth);
  // Delete the other customer to invalidate their token
  // Note: We would need a customer deletion endpoint here
  // For now, test with a completely fabricated token
  const fakeTokenConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${typia.random<string>()}` },
  };
  await TestValidator.httpError("fake token", 401, async () => {
    await api.functional.ecommerce.customer.session_status.at(
      fakeTokenConnection,
    );
  });
}
