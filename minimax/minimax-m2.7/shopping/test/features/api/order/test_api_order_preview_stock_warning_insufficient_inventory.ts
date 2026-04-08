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
 * Test order preview shows stock warning when requested quantity exceeds available inventory.
 *
 * Validates that the order preview endpoint correctly identifies and reports stock insufficiency warnings when a customer attempts to order more items than are available. This test ensures that the system properly flags items where the requested quantity exceeds available inventory and includes these warnings in the preview response without blocking the preview itself.
 *
 * The test follows a realistic shopping flow:
 * 1. Register a new customer with random credentials
 * 2. Create a shipping address for checkout
 * 3. Add an item to cart with quantity 100 (exceeding typical stock levels)
 * 4. Call order preview with the created address
 * 5. Validate response contains stock warnings and correct pricing breakdown
 *
 * Key validations include:
 * - Preview succeeds with 200 OK despite stock warnings
 * - Items with insufficient stock have hasStockWarning = true
 * - availableQuantity reflects actual inventory (less than 100)
 * - Root-level hasWarnings is true when any item has stock warning
 * - Line totals and order totals are calculated based on requested quantity
 *
 * This test ensures customers can preview their order even when stock is insufficient,
 * allowing them to make informed decisions about partial fulfillment.
 */
export async function test_api_order_preview_stock_warning_insufficient_inventory(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new customer
  const customerAuth: IEcommerceMallCustomer.IAuthorized =
    await authorize_customer_join(connection, {});
  // Create customer connection with auth token
  const customerConnection: api.IConnection = { host: connection.host };
  customerConnection.headers = {
    Authorization: `Bearer ${customerAuth.token.access}`,
  };
  // 2. Create shipping address
  const address: IEcommerceMallShippingAddress =
    await generate_random_ecommerce_mall_customer_customers_me_addresses_create(
      customerConnection,
      {},
    );
  // 3. Add item to cart with quantity 100 (exceeding typical stock)
  const cartItem: IEcommerceMallCartItem =
    await generate_random_ecommerce_mall_customer_customers_me_cart_create(
      customerConnection,
      {
        body: {
          quantity: 100 as number & tags.Type<"int32"> & tags.Minimum<1>,
        },
      },
    );
  // 4. Call order preview endpoint
  const preview: IEcommerceMallOrder.IPreview =
    await api.functional.ecommerceMall.customer.customers.me.orders.preview(
      customerConnection,
      {
        body: {
          shippingAddressId: address.id,
        } satisfies IEcommerceMallOrder.IPreviewRequest,
      },
    );
  typia.assert(preview);
  // 5. Validate preview response
  // Validate items exist in preview
  TestValidator.equals(
    "preview contains items",
    preview.items.length > 0,
    true,
  );
  // Find the item we added to cart
  const previewItem = preview.items.find((item) => item.id === cartItem.id);
  TestValidator.equals(
    "preview contains the cart item",
    previewItem !== undefined,
    true,
  );
  if (previewItem) {
    // Validate stock warning flags
    TestValidator.equals(
      "item has stock warning",
      previewItem.hasStockWarning,
      true,
    );
    // Validate available quantity is less than requested
    TestValidator.predicate(
      "available quantity less than requested 100",
      previewItem.availableQuantity < 100,
    );
    // Validate quantities match cart
    TestValidator.equals("quantity matches cart", previewItem.quantity, 100);
    // Validate line total is calculated based on requested quantity
    const expectedLineTotal = previewItem.unitPrice * previewItem.quantity;
    TestValidator.equals(
      "line total calculated correctly",
      previewItem.lineTotal,
      expectedLineTotal,
    );
  }
  // Validate root-level hasWarnings flag
  TestValidator.equals(
    "preview has warnings at root level",
    preview.hasWarnings === true,
    true,
  );
  // Validate pricing breakdown is complete
  TestValidator.predicate("subtotal is non-negative", preview.subtotal >= 0);
  TestValidator.predicate(
    "total amount is non-negative",
    preview.totalAmount >= 0,
  );
  TestValidator.predicate(
    "total equals subtotal plus shipping",
    preview.totalAmount === preview.subtotal + preview.shippingCost,
  );
}
