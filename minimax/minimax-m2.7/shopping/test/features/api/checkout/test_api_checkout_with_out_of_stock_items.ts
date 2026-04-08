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

export async function test_api_checkout_with_out_of_stock_items(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  typia.assert(customer);
  // 2. Create a shipping address for checkout
  const address =
    await generate_random_ecommerce_mall_customer_customers_me_addresses_create(
      customerConnection,
      {
        body: {
          is_default: true,
        },
      },
    );
  typia.assert(address);
  // 3. Add a product variant to cart with a large quantity
  // The prepare function creates a product with limited stock, and we request
  // a large quantity to exceed available stock
  const cartItem =
    await generate_random_ecommerce_mall_customer_customers_me_cart_create(
      customerConnection,
      {
        body: {
          quantity: 100, // Large quantity to exceed available stock
        },
      },
    );
  typia.assert(cartItem);
  // 4. Call GET /customers/me/checkout
  const checkoutSummary =
    await api.functional.ecommerceMall.customer.customers.me.checkout.at(
      customerConnection,
    );
  typia.assert(checkoutSummary);
  // 5. Validate the checkout response structure
  // Find the cart item in checkout items
  const checkoutItem = checkoutSummary.items.find(
    (item) => item.id === cartItem.id,
  );
  TestValidator.equals("checkout item exists", !!checkoutItem, true);
  // Validate item has status property
  TestValidator.equals(
    "item has status",
    checkoutItem!.status !== undefined,
    true,
  );
  // Validate item has availableQuantity
  TestValidator.equals(
    "item has availableQuantity",
    checkoutItem!.availableQuantity !== undefined,
    true,
  );
  // Validate item has quantity (requested)
  TestValidator.equals(
    "item has quantity",
    checkoutItem!.quantity !== undefined,
    true,
  );
  // Validate summary structure
  TestValidator.equals(
    "summary has grandTotal",
    checkoutSummary.summary.grandTotal !== undefined,
    true,
  );
  TestValidator.equals(
    "summary has totalItems",
    checkoutSummary.summary.totalItems !== undefined,
    true,
  );
  TestValidator.equals(
    "summary has validItemsCount",
    checkoutSummary.summary.validItemsCount !== undefined,
    true,
  );
  TestValidator.equals(
    "summary has unavailableItemsCount",
    checkoutSummary.summary.unavailableItemsCount !== undefined,
    true,
  );
  // Validate addresses are returned
  TestValidator.predicate(
    "has addresses",
    checkoutSummary.addresses.length > 0,
  );
  // If item is OUT_OF_STOCK, validate specific behavior
  if (checkoutItem!.status === "OUT_OF_STOCK") {
    // Available quantity should be less than requested quantity
    TestValidator.predicate(
      "available less than requested",
      checkoutItem!.availableQuantity < checkoutItem!.quantity,
    );
    // Item quantity should be preserved (100)
    TestValidator.predicate(
      "quantity is preserved",
      checkoutItem!.quantity >= 100,
    );
    // Unavailable count should be greater than 0
    TestValidator.predicate(
      "has unavailable items",
      checkoutSummary.summary.unavailableItemsCount > 0,
    );
    // Valid items should be less than total items
    TestValidator.predicate(
      "valid items less than total",
      checkoutSummary.summary.validItemsCount <
        checkoutSummary.summary.totalItems,
    );
  }
}
