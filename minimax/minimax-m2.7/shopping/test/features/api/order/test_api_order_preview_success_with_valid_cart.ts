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
 * Test successful order preview with valid cart and shipping address.
 *
 * Validates the complete order preview flow including customer registration, shipping address creation, shopping cart population, and order preview generation. Ensures that the preview correctly calculates subtotals, shipping costs, and total amounts based on the cart items and selected shipping address.
 *
 * This test verifies the order preview endpoint by first setting up a customer with a shipping address and cart items, then calling the preview endpoint to validate the response structure and computed values.
 *
 * 1. Customer registers with valid email, password, and display name.
 * 2. Create a shipping address with recipient name, phone, and full address details.
 * 3. Add a product variant to the shopping cart with quantity 2.
 * 4. Call order preview endpoint with the created shipping address ID.
 * 5. Validate response: orderNumber format, item details, subtotal calculation, shipping cost, total amount, and shipping address match.
 */
export async function test_api_order_preview_success_with_valid_cart(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Create shipping address
  const address =
    await generate_random_ecommerce_mall_customer_customers_me_addresses_create(
      customerConnection,
      {},
    );
  typia.assert(address);
  // 3. Add product to cart
  const cartItem =
    await generate_random_ecommerce_mall_customer_customers_me_cart_create(
      customerConnection,
      {},
    );
  typia.assert(cartItem);
  // 4. Call order preview
  const preview =
    await api.functional.ecommerceMall.customer.customers.me.orders.preview(
      customerConnection,
      {
        body: {
          shippingAddressId: address.id,
        } satisfies IEcommerceMallOrder.IPreviewRequest,
      },
    );
  typia.assert(preview);
  // 5. Validate response
  TestValidator.equals(
    "order number starts with PREVIEW-",
    preview.orderNumber.substring(0, 8),
    "PREVIEW-",
  );
  TestValidator.predicate("preview has items", preview.items.length > 0);
  // Validate each item: lineTotal should equal unitPrice * quantity
  for (const item of preview.items) {
    const expectedLineTotal = item.unitPrice * item.quantity;
    TestValidator.equals(
      "line total equals unitPrice * quantity",
      item.lineTotal,
      expectedLineTotal,
    );
    TestValidator.predicate(
      "available quantity is non-negative",
      item.availableQuantity >= 0,
    );
  }
  // Calculate expected subtotal from items
  const expectedSubtotal = preview.items.reduce(
    (sum, item) => sum + item.lineTotal,
    0,
  );
  TestValidator.equals(
    "subtotal matches sum of line totals",
    preview.subtotal,
    expectedSubtotal,
  );
  // Verify total amount equals subtotal + shipping cost
  const expectedTotal = preview.subtotal + preview.shippingCost;
  TestValidator.equals(
    "total amount equals subtotal + shipping cost",
    preview.totalAmount,
    expectedTotal,
  );
  // Verify shipping address matches created address
  TestValidator.equals(
    "shipping address id matches",
    preview.shippingAddress.id,
    address.id,
  );
  TestValidator.equals(
    "shipping address city matches",
    preview.shippingAddress.city,
    address.city,
  );
  TestValidator.equals(
    "shipping address state matches",
    preview.shippingAddress.state,
    address.state,
  );
  TestValidator.equals(
    "shipping address country matches",
    preview.shippingAddress.country,
    address.country,
  );
  // Verify no warnings when stock is sufficient
  TestValidator.equals(
    "hasWarnings is false",
    preview.hasWarnings ?? false,
    false,
  );
}
