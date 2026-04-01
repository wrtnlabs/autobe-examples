import { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEcommerceMallShipmentsOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentsOrderItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallOrderAtSummaryTransformer } from "./EcommerceMallOrderAtSummaryTransformer";
import { EcommerceMallShipmentAtSummaryTransformer } from "./EcommerceMallShipmentAtSummaryTransformer";

export namespace EcommerceMallShipmentsOrderItemTransformer {
  export type Payload = Prisma.ecommerce_mall_shipments_order_itemsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        shipped_quantity: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        shipment: EcommerceMallShipmentAtSummaryTransformer.select(),
        orderItem: {
          select: {
            created_at: true,
            id: true,
            updated_at: true,
            deleted_at: true,
            total_price: true,
            quantity: true,
            unit_price: true,
            product_name: true,
            product_sku: true,
            variant_name: true,
            product_snapshot_id: true,
            variant_snapshot_id: true,
            seller_snapshot_id: true,
            order: EcommerceMallOrderAtSummaryTransformer.select(),
          },
        },
      },
    } satisfies Prisma.ecommerce_mall_shipments_order_itemsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallShipmentsOrderItem> {
    return {
      id: input.id,
      quantity: input.shipped_quantity,
      unit_price: Number(input.orderItem.unit_price),
      total_price: Number(input.orderItem.total_price),
      product_name: input.orderItem.product_name,
      product_sku: input.orderItem.product_sku,
      variant_name: input.orderItem.variant_name,
      shipment: await EcommerceMallShipmentAtSummaryTransformer.transform(
        input.shipment,
      ),
      order: await EcommerceMallOrderAtSummaryTransformer.transform(
        input.orderItem.order,
      ),
    };
  }
}
