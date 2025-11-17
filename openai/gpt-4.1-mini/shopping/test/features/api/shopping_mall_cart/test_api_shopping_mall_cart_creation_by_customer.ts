import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

export async function test_api_shopping_mall_cart_creation_by_customer(
  connection: api.IConnection,
) {
  // 1. Register new customer account via join
  const createCustomerBody = {
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    href: `https://example.com/signup`,
    referrer: `https://google.com`,
  } satisfies IShoppingMallCustomer.ICreate;

  const authorizedCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: createCustomerBody,
    });
  typia.assert(authorizedCustomer);

  // 2. Create new shopping mall customer record explicitly
  const shoppingMallCustomerBody = {
    email: authorizedCustomer.email,
    password: createCustomerBody.password,
    href: createCustomerBody.href,
    referrer: createCustomerBody.referrer,
  } satisfies IShoppingMallCustomer.ICreate;

  const registeredCustomer: IShoppingMallCustomer =
    await api.functional.shoppingMall.customer.shoppingMallCustomers.create(
      connection,
      { body: shoppingMallCustomerBody },
    );
  typia.assert(registeredCustomer);
  TestValidator.equals(
    "registered customer email matches authorized email",
    registeredCustomer.email,
    authorizedCustomer.email,
  );

  // 3. Create a new shopping mall cart associated with the authenticated customer
  const createCartBody = {
    shopping_mall_customer_session_id: null,
  } satisfies IShoppingMallCart.ICreate;

  const shoppingCart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.shoppingMallCarts.create(
      connection,
      { body: createCartBody },
    );
  typia.assert(shoppingCart);
  TestValidator.equals(
    "shopping cart customer id matches authorized customer id",
    shoppingCart.shopping_mall_customer_id,
    authorizedCustomer.id,
  );
}
