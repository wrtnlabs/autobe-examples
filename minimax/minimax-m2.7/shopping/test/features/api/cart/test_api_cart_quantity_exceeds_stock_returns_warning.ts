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
 * Test updating cart quantity exceeding available stock returns warning.
 *
 * Validates that when a customer updates their cart item quantity to exceed the available stock, the API returns a stock warning while still allowing the modification to proceed. This test verifies the cart isolation security, ensuring one customer's cart items cannot be modified by another customer.
 *
 * **Test Flow:**
 * 1. Create a customer and generate a cart item with limited stock
 * 2. Extract the available stock quantity from the variant
 * 3. Update cart item quantity to exceed available stock (stock + 10)
 * 4. Validate the update succeeds with updated quantity
 * 5. Verify cart isolation: another customer's cartItemId returns error
 *
 * **Business Rules:**
 * - Cart quantity updates succeed even when exceeding available stock
 * - Stock warnings are informational only
 * - Each customer's cart is isolated from other customers
 */
export async function test_api_cart_quantity_exceeds_stock_returns_warning(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Create cart item with limited stock
  const cart = await generate_random_ecommerce_mall_customer_me_cart_create(
    customerConnection,
    {},
  );
  typia.assert(cart);
  // Extract cart item and available stock
  const cartItem = cart.items[0];
  const availableStock = cartItem.variant.quantity;
  const cartItemId = cartItem.id;
  TestValidator.equals("cart has items", cart.items.length, 1);
  TestValidator.predicate("stock is limited", availableStock < 10);
  // 3. Update quantity to exceed available stock
  const requestedQuantity = availableStock + 10;
  const updatedItem = await api.functional.ecommerceMall.customer.me.cart.patch(
    customerConnection,
    {
      body: {
        quantity: requestedQuantity,
      } satisfies IEcommerceMallCartItem.IUpdate,
    },
  );
  typia.assert(updatedItem);
  // 4. Validate update succeeded with requested quantity
  TestValidator.equals(
    "quantity updated to requested value",
    updatedItem.quantity,
    requestedQuantity,
  );
  TestValidator.equals("cartItemId unchanged", updatedItem.id, cartItemId);
  // 5. Verify stock warning context exists
  TestValidator.predicate(
    "variant has limited stock",
    updatedItem.variant.quantity < requestedQuantity,
  );
  // 6. Test cart isolation: another customer's cartItemId returns error
  const otherConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(otherConnection, {});
  await TestValidator.error(
    "another customer cannot update this cart item",
    async () => {
      await api.functional.ecommerceMall.customer.me.cart.patch(
        otherConnection,
        {
          body: {
            quantity: 5,
          } satisfies IEcommerceMallCartItem.IUpdate,
        },
      );
    },
  );
}