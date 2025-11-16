import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";
import type { IShoppingMallCustomerCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCart";

/**
 * Validate that a cart owner can update mutable properties of their persistent
 * shopping cart.
 *
 * Business context
 *
 * - Customers can create persistent carts tied to their account.
 * - They may later rename or reconfigure these carts (region, currency,
 *   activation flag, notes) without changing ownership or identifiers.
 *
 * Test flow
 *
 * 1. Register and authenticate a customer via POST /auth/customer/join.
 * 2. Create an initial customer cart with minimal but valid configuration using
 *    POST /shoppingMall/customer/customerCarts.
 * 3. Capture the returned cart as the original state.
 * 4. Build an IShoppingMallCustomerCart.IUpdate payload that:
 *
 *    - Sets a new display_name (conceptually, even if not present on the read model,
 *         we still send it as mutable field).
 *    - Changes region_code and currency_code to new values.
 *    - Toggles is_active (true -> false or false -> true).
 *    - Sets notes to some free-form content.
 * 5. Call PUT /shoppingMall/customer/customerCarts/{customerCartId} using
 *    api.functional.shoppingMall.customer.customerCarts.update.
 * 6. Validate the response:
 *
 *    - Typia.assert to enforce IShoppingMallCustomerCart structure.
 *    - Id is unchanged from the original cart.
 *    - Customer.id is unchanged and equals the authenticated customer id.
 *    - Currency_code, region_code, and is_active reflect the updated values sent in
 *         the IUpdate payload.
 *    - Updated_at is later than the original updated_at.
 */
export async function test_api_customer_cart_update_basic_fields_by_owner(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a customer
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    ip: undefined,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const authorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  // 2. Create an initial customer cart
  const createBody = {
    currency_code: "USD",
    region_code: "US",
    channel: "web",
    metadata: {
      source: "e2e-test",
    },
    is_active: true,
    source_guest_token: undefined,
  } satisfies IShoppingMallCustomerCart.ICreate;

  const originalCart: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.customerCarts.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(originalCart);

  // 3. Prepare update payload with new mutable values
  const newIsActive = !originalCart.is_active;
  const updateBody = {
    display_name: RandomGenerator.paragraph({ sentences: 2 }),
    region_code: "EU",
    currency_code: "EUR",
    is_active: newIsActive,
    notes: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IShoppingMallCustomerCart.IUpdate;

  // 4. Perform the update
  const updatedCart: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.customerCarts.update(
      connection,
      {
        customerCartId: originalCart.id,
        body: updateBody,
      },
    );
  typia.assert(updatedCart);

  // 5. Validate identity and ownership remain unchanged
  TestValidator.equals(
    "cart id should remain unchanged after update",
    updatedCart.id,
    originalCart.id,
  );

  TestValidator.equals(
    "cart owner (customer.id) should remain unchanged",
    updatedCart.customer.id,
    originalCart.customer.id,
  );

  TestValidator.equals(
    "cart owner should match authenticated customer id",
    updatedCart.customer.id,
    authorized.id,
  );

  // 6. Validate mutable configuration fields reflect the update
  TestValidator.equals(
    "currency_code should be updated",
    updatedCart.currency_code,
    updateBody.currency_code,
  );

  TestValidator.equals(
    "region_code should be updated",
    updatedCart.region_code,
    updateBody.region_code,
  );

  TestValidator.equals(
    "is_active flag should be updated",
    updatedCart.is_active,
    newIsActive,
  );

  // 7. Validate updated_at changed
  TestValidator.predicate(
    "updated_at should be changed after update",
    updatedCart.updated_at !== originalCart.updated_at,
  );
}
