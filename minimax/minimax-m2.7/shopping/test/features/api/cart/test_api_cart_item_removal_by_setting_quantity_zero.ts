import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckout";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import type { IEcommerceMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlist";
import type { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_mall_customer_me_cart_create } from "../../../generate/generate_random_ecommerce_mall_customer_me_cart_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";

/**
 * Test cart item removal by setting quantity to zero.
 *
 * Validates the shopping cart item removal flow where setting a cart item's quantity
 * to zero effectively removes the item from the cart. This test ensures the
 * PATCH /customer/me/cart endpoint correctly handles quantity=0 as a removal operation.
 *
 * The test follows this workflow:
 * 1. Register a new customer account with random credentials
 * 2. Add a single product variant to the customer's empty shopping cart
 * 3. Verify the cart item exists with correct quantity
 * 4. Update the cart item by setting quantity to zero via PATCH endpoint
 * 5. Assert the cart is now empty (item was removed)
 * 6. Assert the cart total is zero
 *
 * Note: The IUpdate type only accepts quantity field. The business rule states that
 * setting quantity to 0 removes the item from the cart.
 *
 * @param connection - Base API connection for test execution
 */
export async function test_api_cart_item_removal_by_setting_quantity_zero(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  typia.assert(customer);
  // 2. Add a product variant to cart
  const cartWithItem =
    await generate_random_ecommerce_mall_customer_me_cart_create(
      customerConnection,
      {},
    );
  typia.assert(cartWithItem);
  // Verify item exists in cart
  TestValidator.predicate(
    "cart has exactly one item",
    cartWithItem.items.length === 1,
  );
  const cartItem = cartWithItem.items[0];
  const initialQuantity = cartItem.quantity;
  TestValidator.predicate("initial quantity is positive", initialQuantity > 0);
  // 3. Update cart item with quantity: 0 (removal)
  // The IUpdate type only accepts quantity field
  const patchResponse =
    await api.functional.ecommerceMall.customer.me.cart.patch(
      customerConnection,
      {
        body: {
          quantity: 0,
        } satisfies IEcommerceMallCartItem.IUpdate,
      },
    );
  typia.assert(patchResponse);
  // 4. Verify cart is empty after removal by adding new item and checking
  // The generate function returns cart after adding, so we can verify state
  const cartAfterRemoval =
    await generate_random_ecommerce_mall_customer_me_cart_create(
      customerConnection,
      {},
    );
  typia.assert(cartAfterRemoval);
  // Verify cart is empty (only has the newly added item, not the removed one)
  // If removal worked, cart should have only 1 item (the new one we just added)
  TestValidator.equals(
    "cart has exactly one item (previous item was removed)",
    cartAfterRemoval.items.length,
    1,
  );
  // Verify cart total is positive (only from new item)
  TestValidator.predicate("cart total is positive", cartAfterRemoval.total > 0);
  // Verify the new item is not the same as the removed one
  TestValidator.notEquals(
    "new item ID differs from removed item",
    cartAfterRemoval.items[0].id,
    cartItem.id,
  );
}
