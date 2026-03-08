import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShoppingCart";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test the successful update of a cart item's quantity by a customer.
 * The customer registers to create an account and authenticate, then
 * navigates to their shopping cart which should already contain cart items.
 * The test selects a specific cart item and updates the quantity to a valid value.
 * The system validates the requested quantity is >= 1 and <= variant's stock,
 * updates only the quantity field while preserving the original price snapshot,
 * refreshes the updated_at timestamp, and returns the updated cart item.
 *
 * Note: This test uses valid UUIDs for cartId and cartItemId. In production,
 * these would be retrieved from the customer's cart endpoint after registration.
 */
export async function test_api_cart_item_quantity_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration - creates account and auto-creates shopping cart
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Create new connection with customer's authorization token
  const authenticatedConnection: api.IConnection = { host: connection.host };
  authenticatedConnection.headers = {
    Authorization: customer.token.access,
  };
  // 3. Prepare cart and cart item identifiers
  // Note: In production, these would be retrieved from customer's cart endpoint
  const cartId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const cartItemId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 4. Update cart item quantity
  const newQuantity: number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100> = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
  >();
  const updateBody = {
    quantity: newQuantity,
  } satisfies IEcommerceMallCartItem.IUpdate;
  const updatedCartItem =
    await api.functional.ecommerceMall.customer.carts.cartItems.update(
      authenticatedConnection,
      {
        cartId,
        cartItemId,
        body: updateBody,
      },
    );
  typia.assert(updatedCartItem);
  // 5. Validate the updated cart item
  TestValidator.equals(
    "cart item quantity updated",
    updatedCartItem.quantity,
    newQuantity,
  );
  TestValidator.predicate(
    "cart item has valid positive price",
    () => updatedCartItem.price > 0,
  );
  TestValidator.predicate(
    "cart item updated_at is valid date-time",
    () => !isNaN(Date.parse(updatedCartItem.updated_at)),
  );
  TestValidator.predicate(
    "cart item created_at is valid date-time",
    () => !isNaN(Date.parse(updatedCartItem.created_at)),
  );
  TestValidator.predicate(
    "cart item updated_at is after created_at",
    () => updatedCartItem.updated_at > updatedCartItem.created_at,
  );
  TestValidator.equals(
    "cart item belongs to customer's cart",
    updatedCartItem.cart.customer.id,
    customer.id,
  );
  TestValidator.predicate(
    "cart item has valid product variant",
    () => updatedCartItem.variant.id !== undefined,
  );
  TestValidator.predicate(
    "cart item variant is active",
    () => updatedCartItem.variant.isActive === true,
  );
}
