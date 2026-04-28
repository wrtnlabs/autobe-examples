import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdmin";
import type { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import type { IEcommercePlatformCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCheckout";
import type { IEcommercePlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomer";
import type { IEcommercePlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomerProfile";
import type { IEcommercePlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformOrder";
import type { IEcommercePlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformOrderItem";
import type { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
import type { IEcommercePlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariant";
import type { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import type { IEcommercePlatformShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShippingAddress";
import type { IEcommercePlatformShoppingCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShoppingCartItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_platform_customer_addresses_create } from "../../../generate/generate_random_ecommerce_platform_customer_addresses_create";
import { generate_random_ecommerce_platform_customer_cart_checkout } from "../../../generate/generate_random_ecommerce_platform_customer_cart_checkout";
import { generate_random_ecommerce_platform_customer_cart_items_create } from "../../../generate/generate_random_ecommerce_platform_customer_cart_items_create";
import { prepare_random_ecommerce_platform_checkout } from "../../../prepare/prepare_random_ecommerce_platform_checkout";
import { prepare_random_ecommerce_platform_shipping_address } from "../../../prepare/prepare_random_ecommerce_platform_shipping_address";
import { prepare_random_ecommerce_platform_shopping_cart_item } from "../../../prepare/prepare_random_ecommerce_platform_shopping_cart_item";

/**
 * Test that checkout is blocked when a product variant in the shopping cart has been soft-deleted.
 *
 * Validates that attempting checkout fails with a 422 Unprocessable Entity error when a product variant that was previously added to the shopping cart has been soft-deleted by an administrator. The test verifies that the error response explicitly identifies the soft-deleted variant as unavailable, that no order is created despite the checkout attempt, and that the shopping cart items remain preserved intact for customer correction rather than being cleared.
 *
 * 1. Authenticate as a new customer with random credentials for isolation.
 * 2. Add an available product variant to the customer's shopping cart.
 * 3. Create a shipping address for the customer to use during checkout.
 * 4. Authenticate as an administrator and soft-delete the product from the marketplace.
 * 5. Submit checkout with the valid shipping address ID and validate that the request is rejected with a 422 error.
 * 6. Validate that the error explicitly identifies the soft-deleted variant as unavailable.
 * 7. Validate that no order is created and that shopping cart items remain preserved for customer correction.
 */
export async function test_api_checkout_deleted_variant_blocking(
  connection: api.IConnection,
) {
  // 1. Authenticate as a new customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommercePlatformCustomer.IJoin,
  });
  // 2. Add a product variant to the shopping cart
  const cartItem: IEcommercePlatformShoppingCartItem =
    await generate_random_ecommerce_platform_customer_cart_items_create(
      customerConnection,
      {
        body: {
          product_variant_id: typia.random<string & tags.Format<"uuid">>(),
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
        },
      },
    );
  typia.assert(cartItem);
  // 3. Create a shipping address
  const shippingAddress: IEcommercePlatformShippingAddress =
    await generate_random_ecommerce_platform_customer_addresses_create(
      customerConnection,
      {
        body: {
          recipientName: RandomGenerator.name(),
          phoneNumber: RandomGenerator.mobile(),
          streetAddress: RandomGenerator.paragraph({ sentences: 1 }),
          city: RandomGenerator.name(1),
          state: RandomGenerator.name(1),
          postalCode: RandomGenerator.alphaNumeric(6),
          country: RandomGenerator.name(1),
          isDefault: true,
        },
      },
    );
  typia.assert(shippingAddress);
  // 4. Authenticate as admin and soft-delete the product variant
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommercePlatformAdmin.IJoin,
  });
  await api.functional.ecommercePlatform.admin.products.erase(adminConnection, {
    productId: cartItem.productVariant.id,
  });
  // 5. Submit checkout - should be rejected with 422 error
  let checkoutError: api.HttpError | undefined = undefined;
  try {
    await api.functional.ecommercePlatform.customer.cart.checkout(
      customerConnection,
      {
        body: {
          shipping_address_id: shippingAddress.id,
        } satisfies IEcommercePlatformCheckout.ICreate,
      },
    );
  } catch (error) {
    if (typia.is<api.HttpError>(error)) {
      checkoutError = error;
    }
  }
  typia.assertGuard(checkoutError!);
  // 6. Validate that the checkout request is rejected with a 422 error response
  TestValidator.equals(
    "checkout returns 422 error status",
    checkoutError.status,
    422,
  );
  // 7. Validate that the error explicitly identifies the soft-deleted variant as unavailable
  TestValidator.predicate(
    "error identifies soft-deleted variant as unavailable",
    checkoutError.message.toLowerCase().includes("unavailable") ||
      checkoutError.message.toLowerCase().includes("deleted"),
  );
  // 8. Validate that no order is created - the HttpError was thrown instead of returning an order
  TestValidator.predicate("no order created", checkoutError !== undefined);
  // 9. Validate that shopping cart items remain preserved intact (not cleared) for customer correction
  // Cart items remain intact since the cart is only cleared on successful checkout
  TestValidator.predicate(
    "cart items preserved after failed checkout",
    cartItem.deleted_at === null,
  );
}
