import { IEcommercePlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSeller";
import { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import { IEcommercePlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommercePlatformSellerAtSummaryTransformer } from "./EcommercePlatformSellerAtSummaryTransformer";

export namespace EcommercePlatformShipmentAtSummaryTransformer {
  // 1. Payload type
  export type Payload = Prisma.ecommerce_platform_shipmentsGetPayload<
    ReturnType<typeof select>
  >;
  // 2. select() function
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
        _count: { select: { shipmentItems: true } },
        seller: EcommercePlatformSellerAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_platform_shipmentsFindManyArgs;
  }
  // 3. transform() function
  export async function transform(
    input: Payload,
  ): Promise<IEcommercePlatformShipment.ISummary> {
    return {
      id: input.id,
      carrier_name: input.carrier_name,
      tracking_number: input.tracking_number,
      shipped_at: input.shipped_at.toISOString(),
      confirmed_at: input.confirmed_at?.toISOString() ?? null,
      delivered_at: input.delivered_at?.toISOString() ?? null,
      created_at: input.created_at.toISOString(),
      order_item_count: input._count.shipmentItems,
      seller: await EcommercePlatformSellerAtSummaryTransformer.transform(
        input.seller,
      ),
    };
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommercePlatformShipmentAtSummaryTransformer {
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
//           },
//         } satisfies Prisma.ecommerce_platform_shipmentsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommercePlatformShipment.ISummary> {
//         return {
//   id: {string},
//   carrier_name: {string},
//   tracking_number: {string},
//   shipped_at: {string},
//   confirmed_at: {string | null},
//   delivered_at: {string | null},
//   created_at: {string},
//   order_item_count: {integer},
//   seller: await EcommercePlatformSellerAtSummaryTransformer.transform(input.seller),
//         };
//       }
//     }
//--------------------------------------------------------------