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
import { generate_random_ecommerce_mall_customer_me_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_me_cart_items_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";

/**
 * Test removing the last item from cart results in empty cart state.
 *
 * Validates the complete cart item removal workflow when the customer removes their only item from the shopping cart. This test ensures that:
 *
 * 1. Customer registration and authentication works correctly
 * 2. Adding a single product variant to the cart creates the expected cart state
 * 3. The cart correctly displays one item with a non-zero subtotal
 * 4. Removing the only cart item via DELETE endpoint succeeds with 200 OK
 * 5. Attempting to remove the same item again fails with 404, confirming the cart is now empty
 *
 * This test follows the natural shopping flow where a customer adds an item,
 * then decides to remove it before proceeding to checkout.
 *
 * 1. Register a new customer account using POST /auth/customer/join
 * 2. Add a single product variant to the cart using POST /customer/me/cart/items
 * 3. Verify the cart contains exactly one item with non-zero total
 * 4. Remove the only cart item using DELETE /customer/me/cart/items/{cartItemId}
 * 5. Verify the removal succeeds (no error thrown)
 * 6. Attempt to remove the same item again - expect 404 error
 * 7. Validate that attempting to access non-existent cart item confirms empty cart state
 */
export async function test_api_cart_item_removal_empty_cart(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new customer account
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Add a single product variant to the cart
  const cartItem =
    await generate_random_ecommerce_mall_customer_me_cart_items_create(
      customerConnection,
      {},
    );
  typia.assert(cartItem);
  // 3. Verify the cart contains exactly one item with non-zero total
  TestValidator.equals("cart item quantity is 1", cartItem.quantity, 1);
  TestValidator.predicate(
    "cart item subtotal is positive",
    cartItem.subtotal > 0,
  );
  // 4. Remove the only cart item using DELETE endpoint
  await api.functional.ecommerceMall.customer.me.cart.items.erase(
    customerConnection,
    {
      cartItemId: cartItem.id,
    },
  );
  // 5. Verify the removal succeeded by attempting to remove the same item again
  // This should fail with 404 since the item no longer exists, confirming empty cart
  await TestValidator.httpError(
    "cart item should not exist after removal (404 expected)",
    404,
    async () =>
      api.functional.ecommerceMall.customer.me.cart.items.erase(
        customerConnection,
        {
          cartItemId: cartItem.id,
        },
      ),
  );
}
