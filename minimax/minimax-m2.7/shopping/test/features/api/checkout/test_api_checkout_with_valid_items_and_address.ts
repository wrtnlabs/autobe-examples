import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckout";
import type { IEcommerceMallCheckoutItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckoutItem";
import type { IEcommerceMallCheckoutItemVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckoutItemVariantOption";
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
 * Test checkout summary retrieval with valid cart items and shipping address.
 *
 * Validates the complete checkout flow including:
 * 1. Customer registration and authentication
 * 2. Shipping address creation with default flag
 * 3. Adding multiple product variants to cart
 * 4. Retrieving checkout summary with validated cart items
 * 5. Verifying item availability status, pricing, and subtotal calculations
 * 6. Confirming shipping addresses are returned with default indicator
 * 7. Validating computed totals match available items only
 */
export async function test_api_checkout_with_valid_items_and_address(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new customer account
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Create shipping address for checkout
  const address =
    await generate_random_ecommerce_mall_customer_customers_me_addresses_create(
      customerConnection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          street_address: `${RandomGenerator.alphabets(5)} Street`,
          city: RandomGenerator.alphabets(8),
          state: RandomGenerator.alphabets(6),
          postal_code: "12345",
          country: "Test Country",
          is_default: true,
        } satisfies IEcommerceMallShippingAddress.ICreate,
      },
    );
  typia.assert(address);
  // 3. Create first cart item (generation function creates random variant)
  const cartItem1 =
    await generate_random_ecommerce_mall_customer_customers_me_cart_create(
      customerConnection,
      {},
    );
  typia.assert(cartItem1);
  // 4. Create second cart item using a different variant
  const cartItem2 =
    await generate_random_ecommerce_mall_customer_customers_me_cart_create(
      customerConnection,
      {},
    );
  typia.assert(cartItem2);
  // 5. Retrieve checkout summary
  const checkoutSummary =
    await api.functional.ecommerceMall.customer.customers.me.checkout.at(
      customerConnection,
    );
  typia.assert(checkoutSummary);
  // 6. Validate response structure and business logic
  TestValidator.equals(
    "checkout has items array",
    checkoutSummary.items !== undefined,
    true,
  );
  TestValidator.equals(
    "checkout has addresses array",
    checkoutSummary.addresses !== undefined,
    true,
  );
  TestValidator.equals(
    "checkout has summary object",
    checkoutSummary.summary !== undefined,
    true,
  );
  TestValidator.predicate(
    "items array is not empty",
    checkoutSummary.items.length > 0,
  );
  TestValidator.equals(
    "totalItems matches items array length",
    checkoutSummary.summary.totalItems,
    checkoutSummary.items.length,
  );
  const availableItems = checkoutSummary.items.filter(
    (item) => item.status === "AVAILABLE",
  );
  TestValidator.equals(
    "validItemsCount equals available items count",
    checkoutSummary.summary.validItemsCount,
    availableItems.length,
  );
  TestValidator.equals(
    "unavailableItemsCount is 0",
    checkoutSummary.summary.unavailableItemsCount,
    0,
  );
  const computedGrandTotal = availableItems.reduce(
    (sum, item) => sum + item.subtotal,
    0,
  );
  TestValidator.equals(
    "grandTotal matches sum of available item subtotals",
    checkoutSummary.summary.grandTotal,
    computedGrandTotal,
  );
  TestValidator.predicate(
    "addresses array is not empty",
    checkoutSummary.addresses.length > 0,
  );
  const defaultAddress = checkoutSummary.addresses.find(
    (addr) => addr.is_default,
  );
  TestValidator.equals(
    "default address exists",
    defaultAddress !== undefined,
    true,
  );
  for (const item of checkoutSummary.items) {
    TestValidator.predicate("item has id", item.id !== undefined);
    TestValidator.predicate("item has quantity > 0", item.quantity > 0);
    TestValidator.predicate("item has unitPrice", item.unitPrice !== undefined);
    TestValidator.predicate("item has subtotal", item.subtotal !== undefined);
    TestValidator.predicate("item has variant", item.variant !== undefined);
    TestValidator.predicate("item has product", item.product !== undefined);
    TestValidator.predicate(
      "subtotal equals quantity * unitPrice",
      item.subtotal === item.quantity * item.unitPrice,
    );
  }
}
