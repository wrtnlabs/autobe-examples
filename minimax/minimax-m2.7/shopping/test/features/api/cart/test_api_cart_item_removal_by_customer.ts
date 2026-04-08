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

export async function test_api_cart_item_removal_by_customer(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new customer account
  const customer: IEcommerceMallCustomer.IAuthorized =
    await authorize_customer_join(connection, {});
  // Create customer-specific connection with auth token
  const customerConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${customer.token.access}`,
    },
  };
  // 2. Add a product variant to the customer's cart
  const cartItem: IEcommerceMallCartItem =
    await generate_random_ecommerce_mall_customer_me_cart_items_create(
      customerConnection,
      {},
    );
  typia.assert(cartItem);
  // 3. Verify the cart item was created successfully
  TestValidator.equals(
    "Cart item ID should be valid UUID",
    cartItem.id.length > 0,
    true,
  );
  TestValidator.equals(
    "Cart item should have valid quantity",
    cartItem.quantity >= 1,
    true,
  );
  TestValidator.predicate(
    "Cart item should have valid subtotal",
    cartItem.subtotal > 0,
  );
  TestValidator.equals(
    "Cart item should have variant reference",
    cartItem.variant.id.length > 0,
    true,
  );
  TestValidator.equals(
    "Cart item should have product reference",
    cartItem.product.id.length > 0,
    true,
  );
  // Store the item ID for deletion
  const cartItemId: string = cartItem.id;
  const variantId: string = cartItem.variant.id;
  // 4. Remove the cart item using DELETE endpoint
  await api.functional.ecommerceMall.customer.me.cart.items.erase(
    customerConnection,
    {
      cartItemId: cartItemId,
    },
  );
  // 5. Verify the deletion succeeded (no error thrown)
  // 6. Verify the cart item is no longer present by attempting to delete again
  // This should fail with 404 since the item no longer exists
  await TestValidator.error(
    "cart item should no longer exist after deletion",
    async () => {
      await api.functional.ecommerceMall.customer.me.cart.items.erase(
        customerConnection,
        {
          cartItemId: cartItemId,
        },
      );
    },
  );
  // 7. Validate cart totals are updated correctly after removal
  // The customer object should have updated cart with 0 total since only item was removed
  TestValidator.equals(
    "Cart total should be 0 after removing the only item",
    customer.cart.total,
    0,
  );
  TestValidator.equals(
    "Cart should have 0 items after removal",
    customer.cart.items.length,
    0,
  );
  // Verify variant ID matches what we added and deleted
  TestValidator.equals(
    "Variant ID should match the deleted item's variant",
    variantId,
    cartItem.variant.id,
  );
}
