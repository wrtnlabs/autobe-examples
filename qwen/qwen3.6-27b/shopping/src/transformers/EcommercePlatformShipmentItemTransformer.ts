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
import { EcommercePlatformOrderItemAtSummaryTransformer } from "./EcommercePlatformOrderItemAtSummaryTransformer";
import { EcommercePlatformShipmentAtSummaryTransformer } from "./EcommercePlatformShipmentAtSummaryTransformer";

export namespace EcommercePlatformShipmentItemTransformer {
  export type Payload = Prisma.ecommerce_platform_shipment_itemsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        updated_at: true,
        shipment: EcommercePlatformShipmentAtSummaryTransformer.select(),
        orderItem: EcommercePlatformOrderItemAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_platform_shipment_itemsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommercePlatformShipmentItem> {
    return {
      id: input.id,
      shipment: await EcommercePlatformShipmentAtSummaryTransformer.transform(
        input.shipment,
      ),
      orderItem: await EcommercePlatformOrderItemAtSummaryTransformer.transform(
        input.orderItem,
      ),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    } satisfies IEcommercePlatformShipmentItem;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommercePlatformShipmentItemTransformer {
//       export type Payload = Prisma.ecommerce_platform_shipment_itemsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             created_at: true,
//             updated_at: true,
//             shipment: EcommercePlatformShipmentAtSummaryTransformer.select(),
//             orderItem: EcommercePlatformOrderItemAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.ecommerce_platform_shipment_itemsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommercePlatformShipmentItem> {
//         return {
//   id: {string},
//   shipment: await EcommercePlatformShipmentAtSummaryTransformer.transform(input.shipment),
//   orderItem: await EcommercePlatformOrderItemAtSummaryTransformer.transform(input.orderItem),
//   created_at: {string},
//   updated_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------