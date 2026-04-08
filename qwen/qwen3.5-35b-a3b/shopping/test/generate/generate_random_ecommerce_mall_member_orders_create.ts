import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerAddress";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_ecommerce_mall_order } from "../prepare/prepare_random_ecommerce_mall_order";

/**
 * Generate a random order via the API for E2E testing.
 *
 * Prepares random order creation data using the prepare function, then calls the order creation endpoint
 * to create a new order with randomized shipping address and order items. This enables testing of
 * checkout flow, order creation, and order management functionality.
 */
export async function generate_random_ecommerce_mall_member_orders_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommerceMallOrder.ICreate>;
  },
): Promise<IEcommerceMallOrder> {
  const prepared: IEcommerceMallOrder.ICreate =
    prepare_random_ecommerce_mall_order(props.body);
  const result: IEcommerceMallOrder =
    await api.functional.ecommerceMall.member.orders.create(connection, {
      body: prepared,
    });
  return result;
}
