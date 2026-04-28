import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
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

import { prepare_random_ecommerce_platform_order } from "../prepare/prepare_random_ecommerce_platform_order";

/**
 * Generate a random ecommerce platform order via the API for E2E testing.
 *
 * Prepares random order data using the prepare function, including 1-5 order items
 * with product variant references, quantities, and prices, as well as a shipping
 * address UUID. Then calls the creation endpoint to process the customer checkout
 * and create a permanent order record.
 *
 * The returned order contains the system-generated order number, all order items
 * with their fulfillment status, the customer profile, and the preserved shipping
 * address for delivery.
 */
export async function generate_random_ecommerce_platform_customer_orders_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommercePlatformOrder.ICreate> | undefined;
  },
): Promise<IEcommercePlatformOrder> {
  const prepared: IEcommercePlatformOrder.ICreate =
    prepare_random_ecommerce_platform_order(props.body);
  return await api.functional.ecommercePlatform.customer.orders.create(
    connection,
    {
      body: prepared,
    },
  );
}
