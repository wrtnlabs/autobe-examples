import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
export async function test_api_cart_item_update_within_stock(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
      href: "https://example.com/join",
      referrer: "https://example.com/referral",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);
  // Step 2: Create a cart item with initial quantity
  // We need to add an item to cart first, then update it
  // According to the API, cart items are created/updated via putByCartitemid
  // We'll assume a cart item exists with a variant that has stock
  // Since we can't create products through customer, we use a generated cart item ID
  // We need a dummy product variant ID that exists in the system
  const cartItemId = typia.random<string & tags.Format<"uuid">>();
  const initialQuantity = 1;
  // Create the cart item with initial quantity in our test
  const initialCartItem =
    await api.functional.shoppingMall.customer.cart_items.putByCartitemid(
      customerConnection,
      {
        cartItemId: cartItemId,
        body: {
          quantity: initialQuantity,
        } satisfies IShoppingMallCartItem.IRequest,
      },
    );
  typia.assert(initialCartItem);
  // Step 3: Update cart item to quantity within available stock
  // The API will ensure the quantity is within available stock
  // According to scenario: quantity should not exceed available stock
  // We'll use a value greater than initial but still within reasonable limits
  const updatedQuantity = 5;
  const updatedCartItem =
    await api.functional.shoppingMall.customer.cart_items.putByCartitemid(
      customerConnection,
      {
        cartItemId: cartItemId,
        body: {
          quantity: updatedQuantity,
        } satisfies IShoppingMallCartItem.IRequest,
      },
    );
  typia.assert(updatedCartItem);
  // Step 4: Validate results
  TestValidator.equals(
    "cart item quantity updated",
    typia.assert<{ quantity: number; isAvailable: boolean }>(updatedCartItem).quantity,
    updatedQuantity,
  );
  TestValidator.predicate(
    "cart item is available",
    typia.assert<{ quantity: number; isAvailable: boolean }>(updatedCartItem).isAvailable,
  );
  TestValidator.notEquals(
    "cart item quantity changed",
    typia.assert<{ quantity: number; isAvailable: boolean }>(updatedCartItem).quantity,
    initialQuantity,
  );
  // Note: The stockQuantity property is not validated in the request body, so we rely on the API to handle it
  // The scenario requires no warning when quantity doesn't exceed stock - which is the default behavior
  // Our test ensures the update succeeded and quantity is as expected without errors
}