import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";

export async function test_api_shopping_mall_customer_session_delete_by_customer(
  connection: api.IConnection,
) {
  // 1. Customer joins to get authorized and create a customer account
  const joinBody = {
    email: RandomGenerator.alphaNumeric(8) + "@example.com",
    password: RandomGenerator.alphaNumeric(12),
    href: "https://localhost/",
    referrer: "https://localhost/referrer",
  } satisfies IShoppingMallCustomer.ICreate;
  const authorizedCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, { body: joinBody });
  typia.assert(authorizedCustomer);

  // 2. Create a shopping mall customer record using the authorized customer's email
  const createCustomerBody = {
    email: authorizedCustomer.email,
    password: joinBody.password,
    href: joinBody.href,
    referrer: joinBody.referrer,
  } satisfies IShoppingMallCustomer.ICreate;
  const shoppingCustomer: IShoppingMallCustomer =
    await api.functional.shoppingMall.customer.shoppingMallCustomers.create(
      connection,
      { body: createCustomerBody },
    );
  typia.assert(shoppingCustomer);
  TestValidator.equals(
    "createCustomer matches join customer email",
    shoppingCustomer.email,
    authorizedCustomer.email,
  );

  // 3. Create a shopping mall customer session to delete
  const sessionCreateBody = {
    ip: "127.0.0.1",
    href: "https://localhost/session",
    referrer: "https://localhost/referrer",
  } satisfies IShoppingMallCustomerSession.ICreate;
  const session: IShoppingMallCustomerSession =
    await api.functional.shoppingMall.customer.shoppingMallCustomers.shoppingMallCustomerSessions.create(
      connection,
      {
        shoppingMallCustomerId: shoppingCustomer.id,
        body: sessionCreateBody,
      },
    );
  typia.assert(session);

  // 4. Delete the created shopping mall customer session
  await api.functional.shoppingMall.customer.shoppingMallCustomers.shoppingMallCustomerSessions.erase(
    connection,
    {
      shoppingMallCustomerId: shoppingCustomer.id,
      shoppingMallCustomerSessionId: session.id,
    },
  );
}
