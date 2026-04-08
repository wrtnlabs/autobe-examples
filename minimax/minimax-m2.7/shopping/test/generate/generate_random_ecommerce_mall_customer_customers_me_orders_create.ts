import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckout";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_ecommerce_mall_order } from "../prepare/prepare_random_ecommerce_mall_order";

/**
 * Generate a random e-commerce mall order via the API for E2E testing.
 *
 * Creates a new order from the authenticated customer's shopping cart.
 * The customer must have items in their cart and a valid shipping address.
 * The system validates cart contents, freezes product/seller snapshots,
 * deducts inventory, and generates a unique order number.
 *
 * @param connection - API connection for authenticated customer
 * @param props.body - Optional DeepPartial override for order creation data
 * @returns The newly created order with order items and computed totals
 */
export async function generate_random_ecommerce_mall_customer_customers_me_orders_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommerceMallOrder.ICreate>;
  },
): Promise<IEcommerceMallOrder> {
  const prepared: IEcommerceMallOrder.ICreate =
    prepare_random_ecommerce_mall_order(props.body);
  const result: IEcommerceMallOrder =
    await api.functional.ecommerceMall.customer.customers.me.orders.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
