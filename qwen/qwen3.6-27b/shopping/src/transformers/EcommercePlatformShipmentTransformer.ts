import { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import { IEcommercePlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformOrder";
import { IEcommercePlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformOrderItem";
import { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
import { IEcommercePlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariant";
import { IEcommercePlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSeller";
import { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import { IEcommercePlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShipment";
import { IEcommercePlatformShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShipmentItem";
import { IEcommercePlatformShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommercePlatformSellerAtSummaryTransformer } from "./EcommercePlatformSellerAtSummaryTransformer";
import { EcommercePlatformShipmentItemTransformer } from "./EcommercePlatformShipmentItemTransformer";

export namespace EcommercePlatformShipmentTransformer {
  export type Payload = Prisma.ecommerce_platform_shipmentsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        carrier_name: true,
        tracking_number: true,
        shipped_at: true,
        confirmed_at: true,
        delivered_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        seller: EcommercePlatformSellerAtSummaryTransformer.select(),
        shipmentItems: EcommercePlatformShipmentItemTransformer.select(),
      },
    } satisfies Prisma.ecommerce_platform_shipmentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommercePlatformShipment> {
    return {
      id: input.id,
      carrier_name: input.carrier_name,
      tracking_number: input.tracking_number,
      shipped_at: input.shipped_at.toISOString(),
      confirmed_at: input.confirmed_at?.toISOString() ?? null,
      delivered_at: input.delivered_at?.toISOString() ?? null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      seller: await EcommercePlatformSellerAtSummaryTransformer.transform(
        input.seller,
      ),
      shipmentItems: await ArrayUtil.asyncMap(
        input.shipmentItems,
        EcommercePlatformShipmentItemTransformer.transform,
      ),
      shipment_items_count: input.shipmentItems.length,
    } satisfies IEcommercePlatformShipment;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommercePlatformShipmentTransformer {
//       export type Payload = Prisma.ecommerce_platform_shipmentsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             carrier_name: true,
//             tracking_number: true,
//             shipped_at: true,
//             confirmed_at: true,
//             delivered_at: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             seller: EcommercePlatformSellerAtSummaryTransformer.select(),
//             shipmentItems: EcommercePlatformShipmentItemTransformer.select(),
//           },
//         } satisfies Prisma.ecommerce_platform_shipmentsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommercePlatformShipment> {
//         return {
//   id: {string},
//   carrier_name: {string},
//   tracking_number: {string},
//   shipped_at: {string},
//   confirmed_at: {string | null},
//   delivered_at: {string | null},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//   seller: await EcommercePlatformSellerAtSummaryTransformer.transform(input.seller),
//   shipmentItems: await ArrayUtil.asyncMap(input.shipmentItems, EcommercePlatformShipmentItemTransformer.transform),
//   shipment_items_count: {integer},
//         };
//       }
//     }
//--------------------------------------------------------------