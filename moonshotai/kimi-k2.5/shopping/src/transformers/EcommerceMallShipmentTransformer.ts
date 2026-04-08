import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
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
        carrier_name: true,
        tracking_number: true,
        shipped_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        seller: EcommerceMallSellerAtSummaryTransformer.select(),
        order: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_mall_ordersFindManyArgs,
        shipmentItems: EcommerceMallShipmentItemTransformer.select(),
        delivery: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_mall_shipment_deliveriesFindManyArgs,
      },
    } satisfies Prisma.ecommerce_mall_shipmentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallShipment> {
    return {
      id: input.id,
      carrier_name: input.carrier_name,
      tracking_number: input.tracking_number,
      shipped_at: input.shipped_at.toISOString(),
      status: input.delivery ? "delivered" : "in_transit",
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
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
//             carrier_name: true,
//             tracking_number: true,
//             shipped_at: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             seller: EcommerceMallSellerAtSummaryTransformer.select(),
//             order_id: true,
//             shipmentItems: EcommerceMallShipmentItemTransformer.select(),
//           },
//         } satisfies Prisma.ecommerce_mall_shipmentsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallShipment> {
//         return {
//   id: {string},
//   carrier_name: {string},
//   tracking_number: {string},
//   shipped_at: {string},
//   status: {"in_transit" | "delivered"},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//   seller: await EcommerceMallSellerAtSummaryTransformer.transform(input.seller),
//   shipment_items: await ArrayUtil.asyncMap(input.shipmentItems, EcommerceMallShipmentItemTransformer.transform),
//         };
//       }
//     }
//--------------------------------------------------------------