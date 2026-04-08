import { IEcommerceMallShipmentDeliveryStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentDeliveryStatus";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallShipmentDeliveryStatusTransformer {
  export type Payload = Prisma.ecommerce_mall_shipmentsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        order_id: true,
        carrier: true,
        tracking_number: true,
        status: true,
        shipped_at: true,
        delivered_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        seller: true,
        shipmentItems: {
          select: { id: true },
        } satisfies Prisma.ecommerce_mall_shipment_itemsFindManyArgs,
      },
    } satisfies Prisma.ecommerce_mall_shipmentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallShipmentDeliveryStatus> {
    const currentTimestamp = new Date();
    // Compute auto-delivered timestamp if applicable
    let autoDeliveredAt: (string & tags.Format<"date-time">) | null = null;
    if (input.delivered_at === null && input.shipped_at !== null) {
      const shippedDate = new Date(input.shipped_at);
      const autoDeliveryDate = new Date(shippedDate);
      autoDeliveryDate.setDate(autoDeliveryDate.getDate() + 14);
      if (currentTimestamp >= autoDeliveryDate) {
        autoDeliveredAt = toISOStringSafe(autoDeliveryDate);
      }
    }
    // Compute delivery status
    let status: "pending" | "shipped" | "delivered" = "shipped";
    if (input.delivered_at !== null) {
      status = "delivered";
    } else if (input.shipped_at !== null) {
      const shippedDate = new Date(input.shipped_at);
      const autoDeliveryDate = new Date(shippedDate);
      autoDeliveryDate.setDate(autoDeliveryDate.getDate() + 14);
      if (currentTimestamp >= autoDeliveryDate) {
        status = "delivered";
      }
    }
    return {
      status,
      carrierName: input.carrier ?? undefined,
      trackingNumber: input.tracking_number ?? undefined,
      shippingDate: input.shipped_at
        ? toISOStringSafe(new Date(input.shipped_at))
        : null,
      deliveryConfirmedAt:
        input.delivered_at !== null
          ? toISOStringSafe(new Date(input.delivered_at))
          : null,
      autoDeliveredAt,
      itemIds: input.shipmentItems.map((item) => item.id),
    } satisfies IEcommerceMallShipmentDeliveryStatus;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallShipmentDeliveryStatusTransformer {
//       export type Payload = Prisma.ecommerce_mall_shipmentsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             status: true,
//             carrierName: true,
//             trackingNumber: true,
//             shippingDate: true,
//             deliveryConfirmedAt: true,
//             autoDeliveredAt: true,
//             ...
//           },
//         } satisfies Prisma.ecommerce_mall_shipmentsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallShipmentDeliveryStatus> {
//         return {
//   status: {"pending" | "shipped" | "delivered"},
//   carrierName: {string | null},
//   trackingNumber: {string | null},
//   shippingDate: {string | null},
//   deliveryConfirmedAt: {string | null},
//   autoDeliveredAt: {string | null},
//   itemIds: {Array<string>},
//         };
//       }
//     }
//--------------------------------------------------------------