import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { IMallPlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShipment";
import { IMallPlatformShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShipmentItem";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { MallPlatformOrderItemAtSummaryTransformer } from "./MallPlatformOrderItemAtSummaryTransformer";
import { MallPlatformShipmentAtSummaryTransformer } from "./MallPlatformShipmentAtSummaryTransformer";

export namespace MallPlatformShipmentItemTransformer {
  export type Payload = Prisma.mall_platform_shipment_itemsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        shipment: MallPlatformShipmentAtSummaryTransformer.select(),
        orderItem: MallPlatformOrderItemAtSummaryTransformer.select(),
      },
    } satisfies Prisma.mall_platform_shipment_itemsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IMallPlatformShipmentItem> {
    return {
      id: input.id,
      shipment: await MallPlatformShipmentAtSummaryTransformer.transform(
        input.shipment,
      ),
      orderItem: await MallPlatformOrderItemAtSummaryTransformer.transform(
        input.orderItem,
      ),
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
    } satisfies IMallPlatformShipmentItem;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace MallPlatformShipmentItemTransformer {
//       export type Payload = Prisma.mall_platform_shipment_itemsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             shipment: MallPlatformShipmentAtSummaryTransformer.select(),
//             orderItem: MallPlatformOrderItemAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.mall_platform_shipment_itemsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IMallPlatformShipmentItem> {
//         return {
//   id: {string},
//   shipment: await MallPlatformShipmentAtSummaryTransformer.transform(input.shipment),
//   orderItem: await MallPlatformOrderItemAtSummaryTransformer.transform(input.orderItem),
//   createdAt: {string},
//   updatedAt: {string},
//   deletedAt: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------