import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallCustomerAtSummaryTransformer } from "./EcommerceMallCustomerAtSummaryTransformer";

export namespace EcommerceMallOrderAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_mall_ordersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        order_number: true,
        status: true,
        total_amount: true,
        created_at: true,
        customer: EcommerceMallCustomerAtSummaryTransformer.select(),
        subtotal: true,
        shipping_cost: true,
        updated_at: true,
        deleted_at: true,
        shippingAddress: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_mall_shipping_addressesFindManyArgs,
        orderItems: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_mall_order_itemsFindManyArgs,
        shipments: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_mall_shipmentsFindManyArgs,
      },
    } satisfies Prisma.ecommerce_mall_ordersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallOrder.ISummary> {
    return {
      id: input.id,
      order_number: input.order_number,
      status: input.status,
      total_amount: input.total_amount,
      created_at: input.created_at.toISOString(),
      customer: await EcommerceMallCustomerAtSummaryTransformer.transform(
        input.customer,
      ),
    };
  }
}
