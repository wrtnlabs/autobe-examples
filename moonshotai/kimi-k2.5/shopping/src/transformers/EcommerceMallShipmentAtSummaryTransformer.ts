import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEcommerceMallShipmentDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentDelivery";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallOrderAtSummaryTransformer } from "./EcommerceMallOrderAtSummaryTransformer";
import { EcommerceMallShipmentDeliveryAtSummaryTransformer } from "./EcommerceMallShipmentDeliveryAtSummaryTransformer";

export namespace EcommerceMallShipmentAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_mall_shipmentsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        seller_id: true,
        seller: {
          select: {
            id: true,
            email: true,
            approval_status: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
        order_id: true,
        order: EcommerceMallOrderAtSummaryTransformer.select(),
        carrier_name: true,
        tracking_number: true,
        shipped_at: true,
        delivery: EcommerceMallShipmentDeliveryAtSummaryTransformer.select(),
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.ecommerce_mall_shipmentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallShipment.ISummary> {
    return {
      id: input.id,
      sellerId: input.seller_id,
      orderId: input.order_id,
      carrierName: input.carrier_name,
      trackingNumber: input.tracking_number,
      shippedAt: toISOStringSafe(input.shipped_at),
      seller: {
        id: input.seller.id,
        email: input.seller.email,
        shopName: "",
        approvalStatus: input.seller.approval_status,
        createdAt: toISOStringSafe(input.seller.created_at),
        updatedAt: toISOStringSafe(input.seller.updated_at),
        deletedAt: input.seller.deleted_at
          ? toISOStringSafe(input.seller.deleted_at)
          : null,
      } satisfies IEcommerceMallSeller.ISummary,
      order: await EcommerceMallOrderAtSummaryTransformer.transform(
        input.order,
      ),
      delivery: input.delivery
        ? await EcommerceMallShipmentDeliveryAtSummaryTransformer.transform(
            input.delivery,
          )
        : null,
      createdAt: toISOStringSafe(input.created_at),
      updatedAt: toISOStringSafe(input.updated_at),
    };
  }
}
