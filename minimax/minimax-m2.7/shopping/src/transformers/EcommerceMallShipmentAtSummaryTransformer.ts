import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallSellerAtSummaryTransformer } from "./EcommerceMallSellerAtSummaryTransformer";

export namespace EcommerceMallShipmentAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_mall_shipmentsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        carrier: true,
        tracking_number: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        order: {
          select: {
            id: true,
          },
        },
        seller: EcommerceMallSellerAtSummaryTransformer.select(),
        shipmentItems: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_mall_shipment_itemsFindManyArgs,
      },
    } satisfies Prisma.ecommerce_mall_shipmentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallShipment.ISummary> {
    return {
      carrier: input.carrier,
      createdAt: input.created_at.toISOString(),
      id: input.id,
      itemCount: input.shipmentItems.length,
      seller: await EcommerceMallSellerAtSummaryTransformer.transform(
        input.seller,
      ),
      trackingNumber: input.tracking_number,
    } satisfies IEcommerceMallShipment.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallShipmentAtSummaryTransformer {
//       export type Payload = Prisma.ecommerce_mall_shipmentsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             carrier: true,
//             tracking_number: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             ecommerce_mall_order_id: true,
//             seller: EcommerceMallSellerAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.ecommerce_mall_shipmentsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallShipment.ISummary> {
//         return {
//   carrier: {string},
//   createdAt: {string},
//   id: {string},
//   itemCount: {integer},
//   seller: await EcommerceMallSellerAtSummaryTransformer.transform(input.seller),
//   trackingNumber: {string},
//         };
//       }
//     }
//--------------------------------------------------------------