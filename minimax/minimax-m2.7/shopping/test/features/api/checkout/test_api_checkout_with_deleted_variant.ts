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

export async function test_api_checkout_with_deleted_variant(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  typia.assert(customerAuth);
  // 2. Create shipping address for checkout
  await generate_random_ecommerce_mall_customer_customers_me_addresses_create(
    customerConnection,
    {},
  );
  // 3. Generate a non-existent variant UUID to simulate a deleted variant
  // Since seller API is not available in SDK, we use an invalid variant ID
  // that will cause checkout to mark the item as UNAVAILABLE
  const nonExistentVariantId = typia.random<string & tags.Format<"uuid">>();
  // 4. Add the non-existent variant to cart
  // This simulates the scenario where a seller deletes a variant after
  // the customer has added it to their cart
  const cartItem =
    await generate_random_ecommerce_mall_customer_customers_me_cart_create(
      customerConnection,
      {
        body: {
          variantId: nonExistentVariantId,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<3>
          >(),
        },
      },
    );
  typia.assert(cartItem);
  // 5. Call checkout endpoint to validate unavailable variant handling
  const checkoutSummary =
    await api.functional.ecommerceMall.customer.customers.me.checkout.at(
      customerConnection,
    );
  typia.assert(checkoutSummary);
  // 6. Validate business rules for unavailable variant in checkout
  // Find the cart item in checkout summary
  const checkoutItem = checkoutSummary.items.find(
    (item) => item.id === cartItem.id,
  );
  TestValidator.equals(
    "unavailable item appears in checkout items",
    checkoutItem !== undefined,
    true,
  );
  if (checkoutItem) {
    // The non-existent variant should have UNAVAILABLE status
    TestValidator.equals(
      "non-existent variant has UNAVAILABLE status",
      checkoutItem.status,
      "UNAVAILABLE",
    );
    // The item should remain visible (not silently removed)
    // so customer can decide to remove it from cart
    TestValidator.equals(
      "item remains visible in checkout",
      checkoutSummary.items.length,
      1,
    );
  }
  // unavailableItemsCount should reflect the unavailable item
  TestValidator.equals(
    "unavailableItemsCount is 1 for non-existent variant",
    checkoutSummary.summary.unavailableItemsCount,
    1,
  );
  // validItemsCount should be 0 since the only item is unavailable
  TestValidator.equals(
    "validItemsCount is 0 when all items unavailable",
    checkoutSummary.summary.validItemsCount,
    0,
  );
  // grandTotal should be 0 since only unavailable items exist
  TestValidator.equals(
    "grandTotal is 0 when all items unavailable",
    checkoutSummary.summary.grandTotal,
    0,
  );
  // Total items should still be 1 (unavailable item is not removed)
  TestValidator.equals(
    "totalItems includes unavailable items",
    checkoutSummary.summary.totalItems,
    1,
  );
  // Addresses should be returned
  TestValidator.equals(
    "shipping addresses are returned",
    checkoutSummary.addresses.length > 0,
    true,
  );
}
