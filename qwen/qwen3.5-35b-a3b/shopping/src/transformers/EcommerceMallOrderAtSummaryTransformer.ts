import { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallAddressAtSummaryTransformer } from "./EcommerceMallAddressAtSummaryTransformer";

export namespace EcommerceMallOrderAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_mall_ordersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        order_number: true,
        total_price: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        customer: true,
        shippingAddress: EcommerceMallAddressAtSummaryTransformer.select(),
        inventoryRecords: true,
        orderItems: true,
        snapshots: true,
        shipments: true,
        reviews: true,
      },
    } satisfies Prisma.ecommerce_mall_ordersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallOrder.ISummary> {
    return {
      id: input.id,
      order_number: input.order_number,
      total_price: input.total_price,
      status: input.status,
      shipping_address:
        await EcommerceMallAddressAtSummaryTransformer.transform(
          input.shippingAddress,
        ),
      created_at: input.created_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    } satisfies IEcommerceMallOrder.ISummary;
  }
}
