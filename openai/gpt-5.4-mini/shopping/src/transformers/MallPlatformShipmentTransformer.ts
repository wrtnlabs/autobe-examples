import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import { IMallPlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShipment";
import { IMallPlatformShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShipmentItem";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { MallPlatformOrderAtSummaryTransformer } from "./MallPlatformOrderAtSummaryTransformer";
import { MallPlatformSellerAtSummaryTransformer } from "./MallPlatformSellerAtSummaryTransformer";
import { MallPlatformShipmentItemTransformer } from "./MallPlatformShipmentItemTransformer";

export namespace MallPlatformShipmentTransformer {
  export type Payload = Prisma.mall_platform_shipmentsGetPayload<
    ReturnType<typeof select>
  >;
  export async function transform(
    input: Payload,
  ): Promise<IMallPlatformShipment> {
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
      shipmentItems: await ArrayUtil.asyncMap(
        input.shipmentItems,
        MallPlatformShipmentItemTransformer.transform,
      ),
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
    } satisfies IMallPlatformShipment;
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
        shipmentItems: MallPlatformShipmentItemTransformer.select(),
      },
    } satisfies Prisma.mall_platform_shipmentsFindManyArgs;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace MallPlatformShipmentTransformer {
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
//             shipmentItems: MallPlatformShipmentItemTransformer.select(),
//           },
//         } satisfies Prisma.mall_platform_shipmentsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IMallPlatformShipment> {
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
//   shipmentItems: await ArrayUtil.asyncMap(input.shipmentItems, MallPlatformShipmentItemTransformer.transform),
//   createdAt: {string},
//   updatedAt: {string},
//   deletedAt: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------