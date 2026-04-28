import api from "@ORGANIZATION/PROJECT-api";
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
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_ecommerce_platform_checkout } from "../prepare/prepare_random_ecommerce_platform_checkout";

/**
 * Generate a random order by checking out the authenticated customer's shopping cart for E2E testing.
 *
 * Prepares random checkout data including a shipping address UUID, then calls the checkout endpoint to transition cart items into a confirmed order. The system validates item availability (stock and variant existence) and captures the shipping address immutably.
 *
 * This function requires that the customer has items in their cart and that the shipping address referenced in the checkout data exists and belongs to the authenticated customer. Upon success, the cart is cleared and the created order with all line items is returned.
 */
export async function generate_random_ecommerce_platform_customer_cart_checkout(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommercePlatformCheckout.ICreate> | undefined;
  },
): Promise<IEcommercePlatformOrder> {
  const prepared: IEcommercePlatformCheckout.ICreate =
    prepare_random_ecommerce_platform_checkout(props.body);
  const result: IEcommercePlatformOrder =
    await api.functional.ecommercePlatform.customer.cart.checkout(connection, {
      body: prepared,
    });
  return result;
}
