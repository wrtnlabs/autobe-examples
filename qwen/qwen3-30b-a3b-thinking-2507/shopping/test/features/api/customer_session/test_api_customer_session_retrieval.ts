import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_customer_session_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new customer account
  const customerEmail: string = typia.random<string & tags.Format<"email">>();
  const customerUsername: string = typia.random<
    string & tags.MinLength<3> & tags.MaxLength<30>
  >();
  const customerJoinResponse = await api.functional.auth.customer.join(
    connection,
    {
      body: {
        email: customerEmail,
        username: customerUsername,
      } satisfies IShoppingMallCustomer.IJoin,
    },
  );
  typia.assert(customerJoinResponse);
  const customerId = customerJoinResponse.id;
  // 2. Log in as this customer to get auth token
  const customerConnection = { host: connection.host };
  const loginResponse = await api.functional.auth.customer.login(
    customerConnection,
    {
      body: {
        email: customerEmail,
        password: "password123",
        href: "https://example.com",
        referrer: "https://example.com/login",
        ip: "127.0.0.1",
      } satisfies IShoppingMallCustomer.ILogin,
    },
  );
  typia.assert(loginResponse);
  // 3. Generate random session ID for retrieval test
  const sessionId = typia.random<string & tags.Format<"uuid">>();
  // 4. Retrieve and validate session details
  const session =
    await api.functional.shoppingMall.customer.customers.sessions.at(
      customerConnection,
      {
        customerId,
        sessionId,
      },
    );
  typia.assert(session);
  TestValidator.equals(
    "session token matches login access token",
    session.token,
    loginResponse.token.access,
  );
  TestValidator.equals(
    "session expiry matches login token expiry",
    session.expiresAt,
    loginResponse.token.expired_at,
  );
  TestValidator.equals(
    "session client IP matches login IP",
    session.clientIp,
    "127.0.0.1",
  );
  // 5. Verify customer cannot access other users' sessions
  const differentCustomerId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "customer cannot access other user's session",
    async () => {
      await api.functional.shoppingMall.customer.customers.sessions.at(
        customerConnection,
        { customerId: differentCustomerId, sessionId },
      );
    },
  );
}