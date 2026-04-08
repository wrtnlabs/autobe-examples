import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import { IMallPlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShipment";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { MallPlatformOrderAtSummaryTransformer } from "./MallPlatformOrderAtSummaryTransformer";
import { MallPlatformSellerAtSummaryTransformer } from "./MallPlatformSellerAtSummaryTransformer";

export namespace MallPlatformShipmentAtSummaryTransformer {
  export type Payload = Prisma.mall_platform_shipmentsGetPayload<
    ReturnType<typeof select>
  >;
  export async function transform(
    input: Payload,
  ): Promise<IMallPlatformShipment.ISummary> {
    return {
      id: input.id,
      seller: await MallPlatformSellerAtSummaryTransformer.transform(
        input.seller,
      ),
      order: await MallPlatformOrderAtSummaryTransformer.transform(input.order),
      carrierName: input.carrier_name,
      trackingNumber: input.tracking_number,
      trackingUrl: input.tracking_url ?? null,
      status: input.status,
      shippedAt: input.shipped_at?.toISOString() ?? null,
      deliveredAt: input.delivered_at?.toISOString() ?? null,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
    } satisfies IMallPlatformShipment.ISummary;
  }
  export function select() {
    return {
      select: {
        id: true,
        carrier_name: true,
        tracking_number: true,
        tracking_url: true,
        status: true,
        shipped_at: true,
        delivered_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        seller: MallPlatformSellerAtSummaryTransformer.select(),
        order: MallPlatformOrderAtSummaryTransformer.select(),
        shipmentItems: { select: {} },
      },
    } satisfies Prisma.mall_platform_shipmentsFindManyArgs;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace MallPlatformShipmentAtSummaryTransformer {
//       export type Payload = Prisma.mall_platform_shipmentsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             carrier_name: true,
//             tracking_number: true,
//             tracking_url: true,
//             status: true,
//             shipped_at: true,
//             delivered_at: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             seller: MallPlatformSellerAtSummaryTransformer.select(),
//             order: MallPlatformOrderAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.mall_platform_shipmentsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IMallPlatformShipment.ISummary> {
//         return {
//   id: {string},
//   seller: await MallPlatformSellerAtSummaryTransformer.transform(input.seller),
//   order: await MallPlatformOrderAtSummaryTransformer.transform(input.order),
//   carrierName: {string},
//   trackingNumber: {string},
//   trackingUrl: {string | null},
//   status: {string},
//   shippedAt: {string | null},
//   deliveredAt: {string | null},
//   createdAt: {string},
//   updatedAt: {string},
//   deletedAt: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------