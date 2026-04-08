import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallOrderAtSummaryTransformer } from "./EcommerceMallOrderAtSummaryTransformer";
import { EcommerceMallSellerAtSummaryTransformer } from "./EcommerceMallSellerAtSummaryTransformer";

export namespace EcommerceMallShipmentAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_mall_shipmentsGetPayload<
    ReturnType<typeof select>
  >;
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallShipment.ISummary> {
    const deliveryStatus = input.delivery ? "delivered" : "in_transit";
    return {
      id: input.id,
      carrierName: input.carrier_name,
      trackingNumber: input.tracking_number,
      shippedAt: input.shipped_at.toISOString(),
      deliveryStatus,
      itemCount: input._count?.shipmentItems ?? 0,
      seller: await EcommerceMallSellerAtSummaryTransformer.transform(
        input.seller,
      ),
      order: await EcommerceMallOrderAtSummaryTransformer.transform(
        input.order,
      ),
    } satisfies IEcommerceMallShipment.ISummary;
  }
  export function select() {
    return {
      select: {
        id: true,
        carrier_name: true,
        tracking_number: true,
        shipped_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        _count: {
          select: {
            shipmentItems: true,
          },
        },
        seller: EcommerceMallSellerAtSummaryTransformer.select(),
        order: EcommerceMallOrderAtSummaryTransformer.select(),
        delivery: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_mall_shipment_deliveriesFindManyArgs,
      },
    } satisfies Prisma.ecommerce_mall_shipmentsFindManyArgs;
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
//             carrier_name: true,
//             tracking_number: true,
//             shipped_at: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             seller: EcommerceMallSellerAtSummaryTransformer.select(),
//             order: EcommerceMallOrderAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.ecommerce_mall_shipmentsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallShipment.ISummary> {
//         return {
//   id: {string},
//   carrierName: {string},
//   trackingNumber: {string},
//   shippedAt: {string},
//   deliveryStatus: {"in_transit" | "delivered"},
//   itemCount: {integer},
//   seller: await EcommerceMallSellerAtSummaryTransformer.transform(input.seller),
//   order: await EcommerceMallOrderAtSummaryTransformer.transform(input.order),
//         };
//       }
//     }
//--------------------------------------------------------------