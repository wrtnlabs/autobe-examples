import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallSellerAtSummaryTransformer } from "./EcommerceMallSellerAtSummaryTransformer";
import { EcommerceMallShipmentItemTransformer } from "./EcommerceMallShipmentItemTransformer";

export namespace EcommerceMallShipmentTransformer {
  export type Payload = Prisma.ecommerce_mall_shipmentsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        seller_id: true,
        order_id: true,
        carrier: true,
        tracking_number: true,
        status: true,
        shipped_at: true,
        delivered_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        seller: EcommerceMallSellerAtSummaryTransformer.select(),
        shipmentItems: EcommerceMallShipmentItemTransformer.select(),
      },
    } satisfies Prisma.ecommerce_mall_shipmentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallShipment> {
    return {
      id: input.id,
      seller_id: input.seller_id,
      order_id: input.order_id,
      carrier: input.carrier,
      tracking_number: input.tracking_number,
      status: input.status,
      shipped_at: input.shipped_at?.toISOString() ?? null,
      delivered_at: input.delivered_at?.toISOString() ?? null,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      seller: await EcommerceMallSellerAtSummaryTransformer.transform(
        input.seller,
      ),
      shipment_items: await ArrayUtil.asyncMap(
        input.shipmentItems,
        EcommerceMallShipmentItemTransformer.transform,
      ),
    } satisfies IEcommerceMallShipment;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallShipmentTransformer {
//       export type Payload = Prisma.ecommerce_mall_shipmentsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             seller_id: true,
//             order_id: true,
//             carrier: true,
//             tracking_number: true,
//             status: true,
//             shipped_at: true,
//             delivered_at: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             ...
//           },
//         } satisfies Prisma.ecommerce_mall_shipmentsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallShipment> {
//         return {
//   id: {string},
//   seller_id: {string},
//   order_id: {string},
//   carrier: {string | null},
//   tracking_number: {string | null},
//   status: {string},
//   shipped_at: {string | null},
//   delivered_at: {string | null},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//   seller: {IEcommerceMallSeller.ISummary},
//   shipment_items: {Array<IEcommerceMallShipmentItem>},
//         };
//       }
//     }
//--------------------------------------------------------------