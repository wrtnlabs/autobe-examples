import api from "@ORGANIZATION/PROJECT-api";
import type { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import type { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import type { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import type { IECommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrder";
import type { IECommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItem";
import type { IECommerceMallOrderItemSellerSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItemSellerSnapshot";
import type { IECommerceMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItemSnapshot";
import type { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
import type { IECommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariant";
import type { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import type { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import type { IECommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallShipment";
import type { IECommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallShipmentItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_ecommerce_mall_shipment } from "../prepare/prepare_random_ecommerce_mall_shipment";

/**
 * Generate a random e-commerce mall shipment via the API for E2E testing.
 *
 * Prepares random shipment data using the prepare function, then calls the
 * shipment creation endpoint to create an actual shipment resource. The
 * generated shipment contains randomized carrier name, tracking number,
 * and order item UUIDs.
 *
 * The authenticated seller must have 'approved' approval status. All
 * selected order items must belong to the creating seller and be in 'paid'
 * status. Each order item can be assigned to at most one shipment at a time.
 *
 * @param connection - API connection configuration
 * @param props - Optional partial input to override specific properties
 * @returns The newly created shipment with full details
 */
export async function generate_random_e_commerce_mall_seller_shipments_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IECommerceMallShipment.ICreate> | undefined;
  }
): Promise<IECommerceMallShipment> {
  const prepared: IECommerceMallShipment.ICreate = prepare_random_ecommerce_mall_shipment(
    props.body
  );
  return await api.functional.eCommerceMall.seller.shipments.create(
    connection,
    {
      body: prepared,
    },
  );
}