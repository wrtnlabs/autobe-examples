import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallCustomerAtSummaryTransformer } from "./EcommerceMallCustomerAtSummaryTransformer";
import { EcommerceMallOrderItemAtSummaryTransformer } from "./EcommerceMallOrderItemAtSummaryTransformer";
import { EcommerceMallShipmentAtSummaryTransformer } from "./EcommerceMallShipmentAtSummaryTransformer";
import { EcommerceMallShippingAddressAtSummaryTransformer } from "./EcommerceMallShippingAddressAtSummaryTransformer";

export namespace EcommerceMallOrderAtInvertTransformer {
  export type Payload = Prisma.ecommerce_mall_ordersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        order_number: true,
        subtotal: true,
        shipping_cost: true,
        total_amount: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        customer: EcommerceMallCustomerAtSummaryTransformer.select(),
        shippingAddress:
          EcommerceMallShippingAddressAtSummaryTransformer.select(),
        orderItems: EcommerceMallOrderItemAtSummaryTransformer.select(),
        shipments: EcommerceMallShipmentAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_mall_ordersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallOrder.IInvert> {
    return {
      customer: await EcommerceMallCustomerAtSummaryTransformer.transform(
        input.customer,
      ),
      id: input.id,
      order_number: input.order_number,
      subtotal: input.subtotal,
      shipping_cost: input.shipping_cost,
      total_amount: input.total_amount,
      status: input.status,
      shipping_address:
        await EcommerceMallShippingAddressAtSummaryTransformer.transform(
          input.shippingAddress,
        ),
      order_items: await ArrayUtil.asyncMap(
        input.orderItems,
        EcommerceMallOrderItemAtSummaryTransformer.transform,
      ),
      shipments: await ArrayUtil.asyncMap(
        input.shipments,
        EcommerceMallShipmentAtSummaryTransformer.transform,
      ),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
