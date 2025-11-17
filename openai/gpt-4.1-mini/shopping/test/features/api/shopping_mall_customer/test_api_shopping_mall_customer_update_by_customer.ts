import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

export async function test_api_shopping_mall_customer_update_by_customer(
  connection: api.IConnection,
) {
  // 1. Register a new customer via auth/customer/join
  const createCustomerBody = {
    email: "customer" + Date.now() + "@example.com",
    password: "password1234",
    href: "https://example.com/signup",
    referrer: "https://example.com/",
  } satisfies IShoppingMallCustomer.ICreate;
  const authorizedCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: createCustomerBody,
    });
  typia.assert(authorizedCustomer);

  // 2. Create shopping mall customer record
  const createMallCustomerBody = {
    email: authorizedCustomer.email,
    password: "password1234",
    href: "https://example.com/signup",
    referrer: "https://example.com/",
  } satisfies IShoppingMallCustomer.ICreate;

  // However, schema of the create endpoint (shoppingMall.customer.shoppingMallCustomers.create) expects only ICreate, which has email, password, href, referrer so okay

  const mallCustomer: IShoppingMallCustomer =
    await api.functional.shoppingMall.customer.shoppingMallCustomers.create(
      connection,
      {
        body: createMallCustomerBody,
      },
    );
  typia.assert(mallCustomer);

  // 3. Update the customer email
  const updatedEmail = authorizedCustomer.email.replace("@", "+updated@");
  const updateBody = {
    email: updatedEmail,
  } satisfies IShoppingMallCustomer.IUpdate;

  const updatedCustomer: IShoppingMallCustomer =
    await api.functional.shoppingMall.customer.shoppingMallCustomers.update(
      connection,
      {
        shoppingMallCustomerId: mallCustomer.id,
        body: updateBody,
      },
    );
  typia.assert(updatedCustomer);

  // 4. Validate updated email
  TestValidator.equals(
    "updated email is same as input",
    updatedCustomer.email,
    updatedEmail,
  );

  // 5. Validate timestamps updated
  TestValidator.predicate(
    "updated_at timestamp is newer",
    new Date(updatedCustomer.updated_at) > new Date(mallCustomer.updated_at),
  );

  // 6. Validate customer id remains identical
  TestValidator.equals(
    "customer ID unchanged after update",
    updatedCustomer.id,
    mallCustomer.id,
  );
}
