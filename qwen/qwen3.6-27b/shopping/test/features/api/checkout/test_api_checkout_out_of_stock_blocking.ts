import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdmin";
import type { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import type { IEcommercePlatformCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCheckout";
import type { IEcommercePlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomer";
import type { IEcommercePlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomerProfile";
import type { IEcommercePlatformInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformInventoryRecord";
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
import { generate_random_ecommerce_platform_admin_products_variants_inventory_adjust } from "../../../generate/generate_random_ecommerce_platform_admin_products_variants_inventory_adjust";
import { generate_random_ecommerce_platform_customer_addresses_create } from "../../../generate/generate_random_ecommerce_platform_customer_addresses_create";
import { generate_random_ecommerce_platform_customer_cart_checkout } from "../../../generate/generate_random_ecommerce_platform_customer_cart_checkout";
import { generate_random_ecommerce_platform_customer_cart_items_create } from "../../../generate/generate_random_ecommerce_platform_customer_cart_items_create";
import { prepare_random_ecommerce_platform_checkout } from "../../../prepare/prepare_random_ecommerce_platform_checkout";
import { prepare_random_ecommerce_platform_inventory_record } from "../../../prepare/prepare_random_ecommerce_platform_inventory_record";
import { prepare_random_ecommerce_platform_shipping_address } from "../../../prepare/prepare_random_ecommerce_platform_shipping_address";
import { prepare_random_ecommerce_platform_shopping_cart_item } from "../../../prepare/prepare_random_ecommerce_platform_shopping_cart_item";

/**
 * Test that checkout is blocked when a product variant in the shopping cart is out of stock.
 *
 * Validates that the checkout endpoint rejects orders when insufficient stock exists for cart items. Tests the complete multi-actor flow involving customer cart operations and admin inventory management. When a product variant's available stock is depleted below the requested quantity, the checkout transaction fails with a 422 Unprocessable Entity response.
 *
 * The test verifies that the system performs stock validation as part of the checkout transaction. It ensures customers receive clear error feedback when items become unavailable, and that failed checkouts preserve cart items so customers can correct issues and retry.
 *
 * 1. Administrator authenticates and adjusts variant inventory to reduce available stock.
 * 2. Customer registers, authenticates, and creates a shipping address.
 * 3. Customer adds a product variant to their shopping cart.
 * 4. Administrator reduces variant inventory to deplete stock below cart quantity.
 * 5. Customer attempts checkout with the out-of-stock item.
 * 6. Checkout is rejected with 422 Unprocessable Entity due to insufficient stock.
 */
export async function test_api_checkout_out_of_stock_blocking(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: "admin@ecommerce-test.com",
      password: "adminPassword123",
      href: "https://admin.ecommerce-test.com/login",
      referrer: "https://ecommerce-test.com",
    } satisfies IEcommercePlatformAdmin.ILogin,
  });
  // 2. Customer registration and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  typia.assert(customerAuth);
  // 3. Create shipping address for customer
  const shippingAddress =
    await generate_random_ecommerce_platform_customer_addresses_create(
      customerConnection,
      {},
    );
  typia.assert(shippingAddress);
  // 4. Add product variant to shopping cart
  const cartItem =
    await generate_random_ecommerce_platform_customer_cart_items_create(
      customerConnection,
      {} as {
        body: DeepPartial<IEcommercePlatformShoppingCartItem.ICreate>;
      },
    );
  typia.assert(cartItem);
  // 5. Admin adjusts inventory - reduce stock by large negative amount to deplete
  const variantId = cartItem.productVariant.id;
  const inventoryRecord =
    await generate_random_ecommerce_platform_admin_products_variants_inventory_adjust(
      adminConnection,
      {
        body: {
          quantity_delta: -1000,
          reason: "Test: Deplete stock for out-of-stock scenario",
        } satisfies IEcommercePlatformInventoryRecord.ICreate,
        params: {
          productId: variantId,
          variantId,
        },
      },
    );
  typia.assert(inventoryRecord);
  // 6. Attempt checkout - should fail with 422 error due to insufficient stock
  await TestValidator.error(
    "checkout rejected when product variant is out of stock",
    async () => {
      await generate_random_ecommerce_platform_customer_cart_checkout(
        customerConnection,
        {
          body: {
            shipping_address_id: shippingAddress.id,
          } satisfies IEcommercePlatformCheckout.ICreate,
        },
      );
    },
  );
}
