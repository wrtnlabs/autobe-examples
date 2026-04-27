import { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import { IECommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrder";
import { IECommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItem";
import { IECommerceMallOrderItemSellerSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItemSellerSnapshot";
import { IECommerceMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItemSnapshot";
import { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
import { IECommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariant";
import { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import { IECommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallShipment";
import { IECommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallShipmentItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ECommerceMallOrderItemAtSummaryTransformer } from "./ECommerceMallOrderItemAtSummaryTransformer";
import { ECommerceMallOrderItemSellerSnapshotTransformer } from "./ECommerceMallOrderItemSellerSnapshotTransformer";
import { ECommerceMallOrderItemSnapshotTransformer } from "./ECommerceMallOrderItemSnapshotTransformer";
import { ECommerceMallShipmentAtSummaryTransformer } from "./ECommerceMallShipmentAtSummaryTransformer";

export namespace ECommerceMallShipmentItemTransformer {
  export type Payload = Prisma.e_commerce_mall_shipment_itemsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        updated_at: true,
        shipment: ECommerceMallShipmentAtSummaryTransformer.select(),
        orderItem: {
          select: {
            ...ECommerceMallOrderItemAtSummaryTransformer.select().select,
            productVariantSnapshot:
              ECommerceMallOrderItemSnapshotTransformer.select(),
            sellerSnapshot:
              ECommerceMallOrderItemSellerSnapshotTransformer.select(),
          },
        } satisfies Prisma.e_commerce_mall_order_itemsFindManyArgs,
      },
    } satisfies Prisma.e_commerce_mall_shipment_itemsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IECommerceMallShipmentItem> {
    return {
      id: input.id,
      shipment: await ECommerceMallShipmentAtSummaryTransformer.transform(
        input.shipment,
      ),
      orderItem: await ECommerceMallOrderItemAtSummaryTransformer.transform(
        input.orderItem,
      ),
      snapshot: await ECommerceMallOrderItemSnapshotTransformer.transform(
        input.orderItem.productVariantSnapshot!,
      ),
      sellerSnapshot:
        await ECommerceMallOrderItemSellerSnapshotTransformer.transform(
          input.orderItem.sellerSnapshot!,
        ),
      created_at: toISOStringSafe(input.created_at),
    } satisfies IECommerceMallShipmentItem;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ECommerceMallShipmentItemTransformer {
//       export type Payload = Prisma.e_commerce_mall_shipment_itemsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             created_at: true,
//             ...
//           },
//         } satisfies Prisma.e_commerce_mall_shipment_itemsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IECommerceMallShipmentItem> {
//         return {
//   id: {string},
//   shipment: {IECommerceMallShipment.ISummary},
//   orderItem: {IECommerceMallOrderItem.ISummary},
//   snapshot: {IECommerceMallOrderItemSnapshot},
//   sellerSnapshot: {IECommerceMallOrderItemSellerSnapshot},
//   created_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------