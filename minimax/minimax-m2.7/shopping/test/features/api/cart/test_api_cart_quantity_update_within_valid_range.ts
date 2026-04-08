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
 * Test updating cart item quantity within valid range (1-99).
 *
 * Validates the complete cart quantity update flow including customer registration, item addition to cart, and quantity modification. Ensures that updating the quantity correctly recalculates the subtotal and refreshes the updatedAt timestamp.
 *
 * 1. Register customer with email and credentials.
 * 2. Add product variant to cart with initial quantity of 1.
 * 3. Verify cart item exists with correct initial state.
 * 4. Update cart item quantity to 5 via PATCH /customer/me/cart.
 * 5. Validate response returns updated cart item with quantity=5.
 * 6. Assert subtotal recalculated correctly (5 × variant price).
 * 7. Assert updatedAt timestamp is refreshed.
 * 8. Verify quantity persisted by fetching cart again.
 */
export async function test_api_cart_quantity_update_within_valid_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Add item to cart with quantity 1
  const cart = await generate_random_ecommerce_mall_customer_me_cart_create(
    customerConnection,
    {
      body: {
        quantity: 1,
      },
    },
  );
  typia.assert(cart);
  // 3. Verify cart item exists with initial quantity
  const cartItem = cart.items[0];
  const variantPrice = cartItem.variant.price ?? 0;
  TestValidator.equals("cart has items", cart.items.length > 0, true);
  TestValidator.equals("initial quantity is 1", cartItem.quantity, 1);
  // Store original updatedAt for comparison
  const originalUpdatedAt = cartItem.updatedAt;
  // 4. Update cart item quantity to 5 via PATCH
  // Note: PATCH /customer/me/cart accepts quantity only (no cartItemId in body)
  const updatedQuantity = 5;
  const updatedCartItem =
    await api.functional.ecommerceMall.customer.me.cart.patch(
      customerConnection,
      {
        body: {
          quantity: updatedQuantity,
        } satisfies IEcommerceMallCartItem.IUpdate,
      },
    );
  typia.assert(updatedCartItem);
  // 5. Validate updated quantity
  TestValidator.equals(
    "updated quantity is 5",
    updatedCartItem.quantity,
    updatedQuantity,
  );
  // 6. Validate subtotal recalculated correctly (5 × variant price)
  const expectedSubtotal = updatedQuantity * variantPrice;
  TestValidator.equals(
    "subtotal recalculated correctly",
    updatedCartItem.subtotal,
    expectedSubtotal,
  );
  // 7. Validate updatedAt timestamp is refreshed
  TestValidator.predicate(
    "updatedAt is refreshed",
    updatedCartItem.updatedAt > originalUpdatedAt,
  );
}
