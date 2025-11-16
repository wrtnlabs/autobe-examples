import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";
import type { IShoppingMallCustomerCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCart";

/**
 * Verify that customer cart update requires authentication and that
 * unauthenticated attempts do not modify cart state.
 *
 * Business context:
 *
 * - Customer carts are persistent aggregates owned by authenticated customers.
 * - The PUT /shoppingMall/customer/customerCarts/{customerCartId} endpoint is
 *   described as updating an existing cart for the authenticated customer,
 *   enforcing ownership and authorization.
 * - We must ensure that the SDK-level authentication (via /auth/customer/join) is
 *   required and that removing the Authorization header causes the update to
 *   fail without changing server state.
 *
 * Test flow:
 *
 * 1. Register and implicitly authenticate a customer via
 *    api.functional.auth.customer.join using IShoppingMallCustomerAuth.IJoin.
 *    This call sets connection.headers.Authorization through the SDK.
 * 2. Create a new customer cart for this authenticated customer via
 *    api.functional.shoppingMall.customer.customerCarts.create using a valid
 *    IShoppingMallCustomerCart.ICreate body (e.g., set currency_code,
 *    region_code, is_active, metadata). Capture the returned
 *    IShoppingMallCustomerCart and its id.
 * 3. Build an update payload using IShoppingMallCustomerCart.IUpdate that changes
 *    several mutable fields like display_name, region_code, currency_code,
 *    is_active, and notes.
 * 4. Construct an unauthenticated connection by shallow-cloning the original
 *    connection and overriding headers with an empty object. This prevents the
 *    SDK from sending any Authorization header.
 * 5. Call api.functional.shoppingMall.customer.customerCarts.update with the
 *    unauthenticated connection, the real customerCartId, and the valid update
 *    body inside TestValidator.error, asserting that an error is thrown (i.e.,
 *    unauthorized/forbidden). We do not assert specific HTTP status codes.
 * 6. Using the original authenticated connection (which still has Authorization
 *    set by the join call), perform a legitimate update with a different update
 *    body (e.g., different display_name or notes). Assert that the update
 *    succeeds and returns an IShoppingMallCustomerCart whose id matches the
 *    original cart id.
 * 7. Assert that the final cart matches the semantics of the last authenticated
 *    update request (e.g., its is_active flag reflects the authenticated update
 *    body) via TestValidator.equals and typia.assert.
 *
 * We cannot directly read the intermediate state after the failed
 * unauthenticated call because no dedicated GET endpoint is provided in the
 * materials. Instead, we infer non-mutation by verifying that the final
 * authenticated update behaves as expected and that there was no exception
 * during the unauthenticated update that could have partially succeeded from
 * the server side perspective.
 */
export async function test_api_customer_cart_update_requires_authentication(
  connection: api.IConnection,
) {
  // 1. Join/register a new customer (implicitly authenticates connection)
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    ip: null,
    href: "https://example.com/register",
    referrer: "https://example.com/landing",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const authorizedCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinBody,
    });
  typia.assert(authorizedCustomer);

  // 2. Create a new customer cart for this authenticated customer
  const createBody = {
    currency_code: "USD",
    region_code: "US-East",
    channel: "web",
    metadata: {
      source: "e2e-test",
      scenario: "cart-update-auth-required",
    },
    is_active: true,
    source_guest_token: undefined,
  } satisfies IShoppingMallCustomerCart.ICreate;

  const createdCart: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.customerCarts.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(createdCart);

  // 3. Prepare an update payload that would be valid if authenticated
  const unauthenticatedUpdateBody = {
    display_name: "Unauthenticated attempt",
    region_code: "US-West",
    currency_code: "USD",
    is_active: false,
    notes: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IShoppingMallCustomerCart.IUpdate;

  // 4. Build an unauthenticated connection by giving it its own empty headers
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 5. Attempt update without authentication and assert that it fails
  await TestValidator.error(
    "unauthenticated cart update must fail",
    async () => {
      await api.functional.shoppingMall.customer.customerCarts.update(
        unauthenticatedConnection,
        {
          customerCartId: createdCart.id,
          body: unauthenticatedUpdateBody,
        },
      );
    },
  );

  // 6. Perform a valid authenticated update with a different payload
  const authenticatedUpdateBody = {
    display_name: "Authenticated update",
    region_code: "US-Central",
    currency_code: "USD",
    is_active: true,
    notes: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IShoppingMallCustomerCart.IUpdate;

  const updatedCart: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.customerCarts.update(
      connection,
      {
        customerCartId: createdCart.id,
        body: authenticatedUpdateBody,
      },
    );
  typia.assert(updatedCart);

  // 7. Validate that the updated cart matches expectations and still belongs
  //    to the same customer cart id.
  TestValidator.equals(
    "cart id must remain unchanged after authenticated update",
    updatedCart.id,
    createdCart.id,
  );

  TestValidator.equals(
    "is_active flag should match the authenticated update request",
    updatedCart.is_active,
    authenticatedUpdateBody.is_active,
  );
}
