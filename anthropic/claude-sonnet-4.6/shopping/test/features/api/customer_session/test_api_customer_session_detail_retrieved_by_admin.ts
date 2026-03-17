import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfCustomer";
import type { IShoppingMallAdminOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfSeller";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_session_detail_retrieved_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // Step 2: Register a new customer account and capture credentials
  const customerPassword = RandomGenerator.alphaNumeric(16);
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      nickname: RandomGenerator.name(1),
      phone: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(joinResult);
  const customerId = joinResult.id;
  // Step 3: Log in as the customer to create a new session record
  const loginCustomerConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_customer_login(loginCustomerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
    } satisfies IShoppingMallCustomer.ILogin,
  });
  typia.assert(loginResult);
  // Note: IShoppingMallCustomer.IAuthorized does not expose the session UUID directly.
  // The session id (UUID) is an internal identifier not returned by join/login endpoints.
  // We use a random UUID here to demonstrate the correct call structure;
  // in a real integration scenario the session id would need to be obtained
  // via a session listing endpoint (not available in the current SDK).
  const sessionId = typia.random<string & tags.Format<"uuid">>();
  // Step 4: As the administrator, retrieve the customer session details
  const session = await api.functional.shoppingMall.admin.customers.sessions.at(
    adminConnection,
    {
      customerId,
      sessionId,
    },
  );
  typia.assert(session);
  // Validate session business logic after successful retrieval
  TestValidator.equals("customer id matches", session.customer.id, customerId);
  TestValidator.equals(
    "customer email matches",
    session.customer.email,
    customerEmail,
  );
  TestValidator.predicate("customer is not banned", !session.customer.isBanned);
  TestValidator.predicate(
    "access token is non-empty",
    session.access_token.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty",
    session.refresh_token.length > 0,
  );
  TestValidator.predicate(
    "session not yet expired",
    new Date(session.expired_at) > new Date(),
  );
}
