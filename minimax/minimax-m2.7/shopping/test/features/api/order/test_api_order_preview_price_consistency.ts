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
import { generate_random_ecommerce_mall_customer_customers_me_addresses_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_me_addresses_create";
import { generate_random_ecommerce_mall_customer_customers_me_cart_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_me_cart_create";
import { prepare_random_ecommerce_mall_cart } from "../../../prepare/prepare_random_ecommerce_mall_cart";
import { prepare_random_ecommerce_mall_shipping_address } from "../../../prepare/prepare_random_ecommerce_mall_shipping_address";

/**
 * Test order preview validates price consistency showing current prices at preview time.
 *
 * Validates the order preview endpoint returns consistent pricing information across multiple
 * preview calls. The test verifies that unit prices reflect the current variant price at preview
 * time, not cached or historical prices. This ensures customers see accurate pricing before
 * committing to payment.
 *
 * The test follows this workflow:
 * 1. Registers a new customer account with random credentials.
 * 2. Creates a shipping address for the customer.
 * 3. Adds a product variant to the customer's shopping cart.
 * 4. Calls the order preview endpoint twice with the same address.
 * 5. Validates price consistency across both preview responses.
 *
 * Key validation points include:
 * - unitPrice matches the product variant's current price
 * - lineTotal equals unitPrice multiplied by quantity
 * - subtotal equals the sum of all lineTotals
 * - totalAmount equals subtotal plus shippingCost
 * - Prices remain identical across multiple preview calls for the same cart state
 *
 * This test ensures price display accuracy during the checkout flow, preventing scenarios where
 * customers might see outdated or inconsistent pricing information.
 */
export async function test_api_order_preview_price_consistency(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Create a shipping address
  const address =
    await generate_random_ecommerce_mall_customer_customers_me_addresses_create(
      customerConnection,
      {},
    );
  typia.assert(address);
  // 3. Add a product to cart
  const cartItem =
    await generate_random_ecommerce_mall_customer_customers_me_cart_create(
      customerConnection,
      {},
    );
  typia.assert(cartItem);
  // 4. Call order preview first time
  const preview1 =
    await api.functional.ecommerceMall.customer.customers.me.orders.preview(
      customerConnection,
      {
        body: {
          shippingAddressId: address.id,
        } satisfies IEcommerceMallOrder.IPreviewRequest,
      },
    );
  typia.assert(preview1);
  // 5. Call order preview second time
  const preview2 =
    await api.functional.ecommerceMall.customer.customers.me.orders.preview(
      customerConnection,
      {
        body: {
          shippingAddressId: address.id,
        } satisfies IEcommerceMallOrder.IPreviewRequest,
      },
    );
  typia.assert(preview2);
  // 6. Validate price consistency across both preview calls
  TestValidator.equals(
    "order numbers are consistent",
    preview1.orderNumber,
    preview2.orderNumber,
  );
  TestValidator.equals(
    "item counts match",
    preview1.items.length,
    preview2.items.length,
  );
  // Validate each item's price consistency
  for (let i = 0; i < preview1.items.length; i++) {
    const item1 = preview1.items[i];
    const item2 = preview2.items[i];
    TestValidator.equals(
      `item ${i} unitPrice consistent`,
      item1.unitPrice,
      item2.unitPrice,
    );
    TestValidator.equals(
      `item ${i} lineTotal consistent`,
      item1.lineTotal,
      item2.lineTotal,
    );
    TestValidator.equals(
      `item ${i} quantity consistent`,
      item1.quantity,
      item2.quantity,
    );
    // Validate price calculation: lineTotal = unitPrice * quantity
    TestValidator.equals(
      `item ${i} lineTotal equals unitPrice * quantity`,
      item1.lineTotal,
      item1.unitPrice * item1.quantity,
    );
    // Validate unitPrice matches current variant price
    TestValidator.equals(
      `item ${i} unitPrice matches variant price`,
      item1.unitPrice,
      item1.variant.price ?? 0,
    );
  }
  // Validate totals calculation chain
  const calculatedSubtotal = preview1.items.reduce(
    (sum, item) => sum + item.lineTotal,
    0,
  );
  TestValidator.equals(
    "subtotal equals sum of lineTotals",
    preview1.subtotal,
    calculatedSubtotal,
  );
  const calculatedTotal = preview1.subtotal + preview1.shippingCost;
  TestValidator.equals(
    "totalAmount equals subtotal + shippingCost",
    preview1.totalAmount,
    calculatedTotal,
  );
  // Validate subtotal and total are consistent across both previews
  TestValidator.equals(
    "subtotal consistent across previews",
    preview1.subtotal,
    preview2.subtotal,
  );
  TestValidator.equals(
    "shippingCost consistent across previews",
    preview1.shippingCost,
    preview2.shippingCost,
  );
  TestValidator.equals(
    "totalAmount consistent across previews",
    preview1.totalAmount,
    preview2.totalAmount,
  );
}
