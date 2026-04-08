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
 * Test customer isolation when retrieving cart items.
 *
 * Validates that customers cannot access other customers' shopping cart items, enforcing strict customer isolation for cart operations. This test verifies the fundamental security principle that each customer's cart is completely isolated and inaccessible to other customers.
 *
 * **Setup**: Two separate customer accounts are created - Customer A and Customer B. Customer A adds an item to their shopping cart. Customer B then attempts to retrieve Customer A's cart item.
 *
 * **Expected Behavior**: Customer B should receive HTTP 404 Not Found when attempting to access Customer A's cart item, regardless of whether the cartItemId is valid.
 *
 * **Business Rules Validated**:
 * - Cart Customer Isolation Rule: Each customer has exactly one shopping cart. A customer cannot access, view, or modify another customer's cart under any circumstances. The system enforces strict customer isolation for all cart operations.
 *
 * 1. Register Customer A and authenticate.
 * 2. Add an item to Customer A's cart.
 * 3. Extract the cartItemId from Customer A's cart response.
 * 4. Register Customer B with a different account and authenticate.
 * 5. Attempt to retrieve Customer A's cartItemId using Customer B's connection.
 * 6. Validate HTTP 404 error is returned, confirming customer isolation.
 */
export async function test_api_cart_item_customer_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as Customer A
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerA = await authorize_customer_join(customerAConnection, {});
  // 2. Add item to Customer A's cart
  const cartItem =
    await generate_random_ecommerce_mall_customer_me_cart_items_create(
      customerAConnection,
      {},
    );
  typia.assert(cartItem);
  // 3. Extract cartItemId from Customer A's cart item
  const customerACartItemId = cartItem.id;
  // 4. Register and authenticate as Customer B (different account)
  const customerBConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerBConnection, {});
  // 5. Attempt to retrieve Customer A's cart item using Customer B's authentication
  // Expected: HTTP 404 Not Found - Customer B cannot access Customer A's cart items
  await TestValidator.httpError(
    "Customer B cannot access Customer A's cart item",
    404,
    async () =>
      await api.functional.ecommerceMall.customer.me.cart.items.at(
        customerBConnection,
        {
          cartItemId: customerACartItemId,
        },
      ),
  );
}
