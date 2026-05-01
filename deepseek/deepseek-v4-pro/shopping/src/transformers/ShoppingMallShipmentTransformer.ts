import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallOrderItemProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemProductSnapshot";
import { IShoppingMallOrderItemProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemProductSnapshotImage";
import { IShoppingMallOrderItemSellerSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSellerSnapshot";
import { IShoppingMallOrderItemVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemVariantSnapshot";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallOrderAtSummaryTransformer } from "./ShoppingMallOrderAtSummaryTransformer";
import { ShoppingMallOrderItemTransformer } from "./ShoppingMallOrderItemTransformer";
import { ShoppingMallSellerAtSummaryTransformer } from "./ShoppingMallSellerAtSummaryTransformer";

export namespace ShoppingMallShipmentTransformer {
  export type Payload = Prisma.shopping_mall_shipmentsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        carrier_name: true,
        tracking_number: true,
        delivered_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        order: ShoppingMallOrderAtSummaryTransformer.select(),
        seller: ShoppingMallSellerAtSummaryTransformer.select(),
        orderItems: ShoppingMallOrderItemTransformer.select(),
      },
    } satisfies Prisma.shopping_mall_shipmentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallShipment> {
    return {
      id: input.id,
      order: await ShoppingMallOrderAtSummaryTransformer.transform(input.order),
      seller: await ShoppingMallSellerAtSummaryTransformer.transform(
        input.seller,
      ),
      carrier_name: input.carrier_name,
      tracking_number: input.tracking_number,
      delivered_at: input.delivered_at?.toISOString() ?? null,
      orderItems: await ArrayUtil.asyncMap(
        input.orderItems,
        ShoppingMallOrderItemTransformer.transform,
      ),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    } satisfies IShoppingMallShipment;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ShoppingMallShipmentTransformer {
//       export type Payload = Prisma.shopping_mall_shipmentsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             carrier_name: true,
//             tracking_number: true,
//             delivered_at: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             order: ShoppingMallOrderAtSummaryTransformer.select(),
//             seller: ShoppingMallSellerAtSummaryTransformer.select(),
//             ...
//           },
//         } satisfies Prisma.shopping_mall_shipmentsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IShoppingMallShipment> {
//         return {
//   id: {string},
//   order: await ShoppingMallOrderAtSummaryTransformer.transform(input.order),
//   seller: await ShoppingMallSellerAtSummaryTransformer.transform(input.seller),
//   carrier_name: {string},
//   tracking_number: {string},
//   delivered_at: {string | null},
//   orderItems: {Array<IShoppingMallOrderItem>},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------