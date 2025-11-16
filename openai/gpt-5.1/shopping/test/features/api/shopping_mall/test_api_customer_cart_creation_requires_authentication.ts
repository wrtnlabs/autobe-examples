import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";
import type { IShoppingMallCustomerCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCart";

/**
 * Verify that creating a customer cart requires an authenticated customer
 * context.
 *
 * This test performs two complementary flows:
 *
 * 1. Negative (unauthenticated) flow:
 *
 *    - Build an unauthenticated connection by cloning the incoming connection and
 *         clearing its headers.
 *    - Attempt to call POST /shoppingMall/customer/customerCarts with a valid
 *         IShoppingMallCustomerCart.ICreate body.
 *    - Expect the operation to fail due to missing authentication, using
 *         TestValidator.error to verify that an error is thrown.
 * 2. Positive (authenticated) flow:
 *
 *    - Use POST /auth/customer/join with a random IShoppingMallCustomerAuth.IJoin
 *         body to register and authenticate a customer.
 *    - The SDK will inject the Authorization header into the original connection
 *         upon success.
 *    - Using the now-authenticated connection, call POST
 *         /shoppingMall/customer/customerCarts with a valid
 *         IShoppingMallCustomerCart.ICreate body.
 *    - Assert that the call succeeds, the response conforms to
 *         IShoppingMallCustomerCart, and that the resulting cart belongs to the
 *         authorized customer and reflects the requested cart settings.
 */
export async function test_api_customer_cart_creation_requires_authentication(
  connection: api.IConnection,
) {
  // 1. Build an unauthenticated connection by cloning and clearing headers.
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 2. Prepare a minimal but valid cart creation body.
  const unauthCartBody = {
    currency_code: "USD",
    region_code: "US",
    channel: "web",
    is_active: true,
  } satisfies IShoppingMallCustomerCart.ICreate;

  // 3. Ensure unauthenticated cart creation fails.
  await TestValidator.error(
    "customer cart creation must fail without authentication",
    async () => {
      await api.functional.shoppingMall.customer.customerCarts.create(
        unauthenticatedConnection,
        {
          body: unauthCartBody,
        },
      );
    },
  );

  // 4. Join (register) a customer to obtain an authenticated context.
  const joinBody = typia.random<IShoppingMallCustomerAuth.IJoin>();
  const authorizedCustomer = await api.functional.auth.customer.join(
    connection,
    {
      body: joinBody,
    },
  );
  typia.assert<IShoppingMallCustomer.IAuthorized>(authorizedCustomer);

  // 5. Authenticated cart creation should succeed.
  const authCartBody = {
    currency_code: "USD",
    region_code: "US",
    channel: "web",
    is_active: true,
  } satisfies IShoppingMallCustomerCart.ICreate;

  const createdCart =
    await api.functional.shoppingMall.customer.customerCarts.create(
      connection,
      {
        body: authCartBody,
      },
    );
  typia.assert<IShoppingMallCustomerCart>(createdCart);

  // 6. Business validations on the created cart.
  TestValidator.equals(
    "cart is linked to the authenticated customer",
    createdCart.customer.id,
    authorizedCustomer.id,
  );

  TestValidator.equals(
    "cart is active as requested",
    createdCart.is_active,
    authCartBody.is_active ?? true,
  );

  TestValidator.equals(
    "cart currency matches request",
    createdCart.currency_code,
    authCartBody.currency_code ?? createdCart.currency_code,
  );

  TestValidator.equals(
    "cart region matches request",
    createdCart.region_code,
    authCartBody.region_code ?? createdCart.region_code,
  );
}
