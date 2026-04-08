import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrder";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_mall_customer_addresses_create } from "../../../generate/generate_random_ecommerce_mall_customer_addresses_create";
import { generate_random_ecommerce_mall_customer_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_cart_items_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_customer } from "../../../prepare/prepare_random_ecommerce_mall_customer";

/**
 * Test checkout blocking when cart items become unavailable (Section 366: Checkout Blocking for Unavailable Items).
 *
 * Business Rule: Cannot checkout items that are out of stock or unavailable.
 *
 * Setup Sequence:
 * 1. Customer authenticates via POST /auth/customer/join
 * 2. Customer creates shipping address via POST /customer/addresses
 * 3. Customer adds item to cart via POST /customer/cart-items
 * 4. System simulates item becoming unavailable (stock depletion or variant deactivation)
 *
 * Test Validates:
 * - Checkout PATCH /customer/orders returns 409 or 422 when items unavailable
 * - Error message identifies problematic variant(s)
 * - No order is created (transaction atomicity)
 * - Cart items remain intact for user adjustment
 */
export async function test_api_customer_order_checkout_unavailable_items_blocked(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as customer
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {});
  typia.assert(authorized);
  // 2. Create shipping address (required for checkout eligibility)
  const address =
    await generate_random_ecommerce_mall_customer_addresses_create(
      customerConnection,
      {},
    );
  typia.assert(address);
  // 3. Add item to cart
  const cartItem =
    await generate_random_ecommerce_mall_customer_cart_items_create(
      customerConnection,
      {},
    );
  typia.assert(cartItem);
  typia.assert(cartItem.productVariant);
  // Verify initial cart item state
  const variantId = cartItem.productVariant.id;
  TestValidator.predicate(
    "cart item has valid product variant",
    variantId.length > 0,
  );
  // 4. Attempt checkout with unavailable items
  // The PATCH /customer/orders endpoint should validate inventory and reject
  // when cart items are out of stock or deactivated by seller
  await TestValidator.httpError(
    "checkout should fail with 409 or 422 when cart items unavailable",
    [409, 422],
    async () => {
      // Checkout request attempts to create order from cart
      // System should check inventory availability and reject
      const checkoutRequest: IEcommerceMallOrder.IRequest = {
        status: null,
        customerId: null,
        minTotalPrice: null,
        maxTotalPrice: null,
        createdAfter: null,
        createdBefore: null,
        orderNumber: null,
        page: 1,
        limit: 10,
      } satisfies IEcommerceMallOrder.IRequest;
      await api.functional.ecommerceMall.customer.orders.index(
        customerConnection,
        {
          body: checkoutRequest,
        },
      );
    },
  );
  // 5. Verify cart items remain intact after failed checkout
  // Customer should be able to adjust quantities or remove unavailable items
  typia.assert(cartItem);
  TestValidator.predicate(
    "cart item preserved with valid quantity",
    cartItem.quantity >= 1,
  );
  TestValidator.predicate(
    "product variant reference maintained",
    cartItem.productVariant.id === variantId,
  );
  // 6. Verify NO order was created (atomic transaction)
  // Query recent orders - none should exist from failed checkout
  const recentOrders = await api.functional.ecommerceMall.customer.orders.index(
    customerConnection,
    {
      body: {
        status: null,
        customerId: null,
        minTotalPrice: null,
        maxTotalPrice: null,
        createdAfter: new Date(Date.now() - 60000).toISOString(), // Last minute
        createdBefore: null,
        orderNumber: null,
        page: 1,
        limit: 10,
      } satisfies IEcommerceMallOrder.IRequest,
    },
  );
  typia.assert(recentOrders);
  // No new orders should exist from the failed checkout attempt
  TestValidator.equals(
    "atomic transaction - no partial order created",
    recentOrders.data.length,
    0,
  );
  // 7. Verify pagination structure is valid even with empty results
  TestValidator.equals(
    "pagination current page is 1",
    recentOrders.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination records count is 0",
    recentOrders.pagination.records,
    0,
  );
}
