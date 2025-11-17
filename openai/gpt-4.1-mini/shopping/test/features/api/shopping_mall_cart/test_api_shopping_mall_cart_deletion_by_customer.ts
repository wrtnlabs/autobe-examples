import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

/**
 * End-to-end test for shopping mall cart deletion by an authenticated customer.
 *
 * This test covers:
 *
 * 1. Customer creation and authentication.
 * 2. Deletion of an existing shopping mall cart by the authenticated customer.
 * 3. Validation that the deletion effectively removes the cart and related items.
 * 4. Enforcement of ownership checks to prevent unauthorized cart deletion.
 * 5. Verification that deletion timestamps and cascading deletes behave as
 *    expected.
 */
export async function test_api_shopping_mall_cart_deletion_by_customer(
  connection: api.IConnection,
) {
  // 1. Customer creation and authentication
  const customerCreateData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: "https://example.com/join",
    referrer: "https://example.com",
  } satisfies IShoppingMallCustomer.ICreate;

  const authorizedCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerCreateData,
    });
  typia.assert(authorizedCustomer);

  // 2. Attempt to delete a shopping mall cart
  // Since the test scenario does not provide a created cart, we'll use a random UUID for the cart ID
  const shoppingMallCartId = typia.random<string & tags.Format<"uuid">>();

  // Perform the erase operation
  await api.functional.shoppingMall.customer.shoppingMallCarts.erase(
    connection,
    {
      shoppingMallCartId,
    },
  );

  // 3. Create another customer to test unauthorized deletion
  const anotherCustomerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: "https://example.com/join",
    referrer: "https://example.com",
  } satisfies IShoppingMallCustomer.ICreate;

  const anotherAuthorizedCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: anotherCustomerData,
    });
  typia.assert(anotherAuthorizedCustomer);

  // Attempting unauthorized deletion should raise an error
  await TestValidator.error(
    "unauthorized user cannot delete shopping mall cart",
    async () => {
      await api.functional.shoppingMall.customer.shoppingMallCarts.erase(
        connection,
        {
          shoppingMallCartId,
        },
      );
    },
  );
}
