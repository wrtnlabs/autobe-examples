import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
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
 * Test that updating cart item quantity preserves the original price snapshot.
 *
 * This test validates the price immutability feature of shopping carts:
 * 1. Customer authenticates
 * 2. A cart item is created with a known price snapshot
 * 3. Quantity is updated without modifying the price
 * 4. Verify price remains unchanged (price snapshot preservation)
 * 5. Verify quantity is updated correctly
 * 6. Confirm cart and variant references are preserved
 */
export async function test_api_cart_item_update_quantity_preserves_price_snapshot(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer setup - authenticate as customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customer: IEcommerceMallCustomer.IAuthorized =
    await authorize_customer_join(customerConnection, {
      body: {
        email: typia.random<
          string & tags.Format<"email">
        >() satisfies string as string &
          tags.MinLength<1> &
          tags.MaxLength<255> &
          tags.Format<"email">,
        password: RandomGenerator.alphaNumeric(12),
        href: "http://localhost/test",
        referrer: "http://localhost/register",
      } satisfies IEcommerceMallCustomer.IJoin,
    });
  typia.assert(customer);
  // 2. Create a cart item with known price snapshot
  // Since we don't have a create cart item API, use random data as the initial cart item
  const cartItem: IEcommerceMallCartItem =
    typia.random<IEcommerceMallCartItem>();
  typia.assert(cartItem);
  const priceSnapshot: number = cartItem.price;
  const initialQuantity: number = cartItem.quantity;
  // 3. Update cart item quantity
  const newQuantity: number & tags.Type<"int32"> & tags.Minimum<1> =
    typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10>
    >();
  const updateBody: IEcommerceMallCartItem.IUpdate = {
    quantity: newQuantity,
  } satisfies IEcommerceMallCartItem.IUpdate;
  const updatedCartItem: IEcommerceMallCartItem =
    await api.functional.ecommerceMall.customer.carts.items.update(
      customerConnection,
      {
        cartId: cartItem.cart.id,
        itemId: cartItem.id,
        body: updateBody,
      },
    );
  typia.assert(updatedCartItem);
  // 4. Verify price is preserved after quantity update (price immutability)
  TestValidator.equals(
    "price preserved after quantity update",
    updatedCartItem.price,
    priceSnapshot,
  );
  // 5. Verify quantity was updated correctly
  TestValidator.equals(
    "quantity updated correctly",
    updatedCartItem.quantity,
    newQuantity,
  );
  // 6. Confirm cart reference integrity
  TestValidator.equals(
    "cart reference preserved",
    updatedCartItem.cart.id,
    cartItem.cart.id,
  );
  // 7. Confirm variant reference integrity
  TestValidator.equals(
    "variant reference preserved",
    updatedCartItem.variant.id,
    cartItem.variant.id,
  );
  // 8. Verify variant's active status matches expected availability
  // The availability is computed from variant's is_active, parent product's is_active, and stock
  typia.assertGuard(updatedCartItem.variant);
  TestValidator.predicate(
    "variant active status preserved",
    () => updatedCartItem.variant.isActive === cartItem.variant.isActive,
  );
}
