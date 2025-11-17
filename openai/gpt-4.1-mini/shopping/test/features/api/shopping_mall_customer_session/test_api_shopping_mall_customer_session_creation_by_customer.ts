import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";

/**
 * This test validates the creation of a shopping mall customer session by a
 * newly joined customer.
 *
 * The steps are:
 *
 * 1. Perform a join operation to register a new customer and authenticate.
 * 2. Create a shopping mall customer entity separately.
 * 3. Create a new session for the customer using valid connection properties.
 * 4. Validate that the session creation response has expected values.
 * 5. Verify important fields such as shoppingMallCustomerId, is_active, IP, href,
 *    etc.
 */
export async function test_api_shopping_mall_customer_session_creation_by_customer(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new customer via join
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: "https://example.com/signup",
    referrer: "https://google.com",
  } satisfies IShoppingMallCustomer.ICreate;

  const authorizedCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinInput,
    });
  typia.assert(authorizedCustomer);

  // 2. Create a shopping mall customer entity
  const customerCreateInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: "https://example.com/create-customer",
    referrer: "https://example.com",
  } satisfies IShoppingMallCustomer.ICreate;

  const customer: IShoppingMallCustomer =
    await api.functional.shoppingMall.customer.shoppingMallCustomers.create(
      connection,
      {
        body: customerCreateInput,
      },
    );
  typia.assert(customer);

  // 3. Create a shopping mall customer session for the customer
  const sessionCreateInput = {
    ip: "192.168.1.1",
    href: "https://example.com/home",
    referrer: "https://google.com",
    expired_at: null,
    duration_minutes: 60,
    is_active: true,
    device_info: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    user_agent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
  } satisfies IShoppingMallCustomerSession.ICreate;

  const session: IShoppingMallCustomerSession =
    await api.functional.shoppingMall.customer.shoppingMallCustomers.shoppingMallCustomerSessions.create(
      connection,
      {
        shoppingMallCustomerId: customer.id,
        body: sessionCreateInput,
      },
    );
  typia.assert(session);

  // 4. Validate session creation response fields
  TestValidator.equals(
    "Session's customer id matches",
    session.shopping_mall_customer_id,
    customer.id,
  );
  TestValidator.predicate("Session is active", session.is_active);
  TestValidator.equals("Session IP address", session.ip, sessionCreateInput.ip);
  TestValidator.equals(
    "Session href URL",
    session.href,
    sessionCreateInput.href,
  );
  TestValidator.equals(
    "Session referrer URL",
    session.referrer,
    sessionCreateInput.referrer,
  );
  TestValidator.equals(
    "Session device info",
    session.device_info ?? "",
    sessionCreateInput.device_info ?? "",
  );
  TestValidator.equals(
    "Session user agent",
    session.user_agent ?? "",
    sessionCreateInput.user_agent ?? "",
  );
  // Check created_at is ISO string and parsable
  TestValidator.predicate(
    "Session created_at is ISO date",
    typeof session.created_at === "string" &&
      !isNaN(Date.parse(session.created_at)),
  );
}
