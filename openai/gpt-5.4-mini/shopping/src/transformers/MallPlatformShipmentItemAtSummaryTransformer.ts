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

export namespace MallPlatformShipmentItemAtSummaryTransformer {
  export type Payload = Prisma.mall_platform_shipment_itemsGetPayload<
    ReturnType<typeof select>
  >;
  export async function transform(
    input: Payload,
  ): Promise<IMallPlatformShipmentItem.ISummary> {
    return {
      id: input.id,
      shipment: await MallPlatformShipmentAtSummaryTransformer.transform(
        input.shipment,
      ),
      orderItem: await MallPlatformOrderItemAtSummaryTransformer.transform(
        input.orderItem,
      ),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    } satisfies IMallPlatformShipmentItem.ISummary;
  }
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
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace MallPlatformShipmentItemAtSummaryTransformer {
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
//       export async function transform(input: Payload): Promise<IMallPlatformShipmentItem.ISummary> {
//         return {
//   id: {string},
//   shipment: await MallPlatformShipmentAtSummaryTransformer.transform(input.shipment),
//   orderItem: await MallPlatformOrderItemAtSummaryTransformer.transform(input.orderItem),
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------