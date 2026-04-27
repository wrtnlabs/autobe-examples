import { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import { IECommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ECommerceMallSellerAtSummaryTransformer } from "./ECommerceMallSellerAtSummaryTransformer";

export namespace ECommerceMallShipmentAtSummaryTransformer {
  export type Payload = Prisma.e_commerce_mall_shipmentsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        carrier_name: true,
        tracking_number: true,
        shipped_at: true,
        delivered_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        seller: ECommerceMallSellerAtSummaryTransformer.select(),
        shipmentItems: {
          select: { id: true },
        } satisfies Prisma.e_commerce_mall_shipment_itemsFindManyArgs,
      },
    } satisfies Prisma.e_commerce_mall_shipmentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IECommerceMallShipment.ISummary> {
    return {
      id: input.id,
      carrier_name: input.carrier_name,
      tracking_number: input.tracking_number,
      shipped_at: input.shipped_at.toISOString(),
      delivered_at: input.delivered_at?.toISOString() ?? null,
      order_items_count: input.shipmentItems.length,
      seller: await ECommerceMallSellerAtSummaryTransformer.transform(
        input.seller,
      ),
    } satisfies IECommerceMallShipment.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ECommerceMallShipmentAtSummaryTransformer {
//       export type Payload = Prisma.e_commerce_mall_shipmentsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             carrier_name: true,
//             tracking_number: true,
//             shipped_at: true,
//             delivered_at: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             seller: ECommerceMallSellerAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.e_commerce_mall_shipmentsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IECommerceMallShipment.ISummary> {
//         return {
//   id: {string},
//   carrier_name: {string},
//   tracking_number: {string},
//   shipped_at: {string},
//   delivered_at: {string | null},
//   order_items_count: {integer},
//   seller: await ECommerceMallSellerAtSummaryTransformer.transform(input.seller),
//         };
//       }
//     }
//--------------------------------------------------------------