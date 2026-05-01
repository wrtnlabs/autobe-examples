import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
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
import { ShoppingMallOrderItemAtSummaryTransformer } from "./ShoppingMallOrderItemAtSummaryTransformer";
import { ShoppingMallSellerAtSummaryTransformer } from "./ShoppingMallSellerAtSummaryTransformer";

export namespace ShoppingMallShipmentAtSummaryTransformer {
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
        order: ShoppingMallOrderAtSummaryTransformer.select(),
        seller: ShoppingMallSellerAtSummaryTransformer.select(),
        orderItems: ShoppingMallOrderItemAtSummaryTransformer.select(),
      },
    } satisfies Prisma.shopping_mall_shipmentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallShipment.ISummary> {
    return {
      id: input.id,
      carrier_name: input.carrier_name,
      tracking_number: input.tracking_number,
      created_at: input.created_at.toISOString(),
      delivered_at: input.delivered_at?.toISOString() ?? null,
      deliveryStatus: input.delivered_at === null ? "pending" : "delivered",
      order: await ShoppingMallOrderAtSummaryTransformer.transform(input.order),
      seller: await ShoppingMallSellerAtSummaryTransformer.transform(
        input.seller,
      ),
      orderItems: await ArrayUtil.asyncMap(
        input.orderItems,
        ShoppingMallOrderItemAtSummaryTransformer.transform,
      ),
    };
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ShoppingMallShipmentAtSummaryTransformer {
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
//             orderItems: ShoppingMallOrderItemAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.shopping_mall_shipmentsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IShoppingMallShipment.ISummary> {
//         return {
//   id: {string},
//   carrier_name: {string},
//   tracking_number: {string},
//   created_at: {string},
//   delivered_at: {string | null},
//   deliveryStatus: {string},
//   order: await ShoppingMallOrderAtSummaryTransformer.transform(input.order),
//   seller: await ShoppingMallSellerAtSummaryTransformer.transform(input.seller),
//   orderItems: await ArrayUtil.asyncMap(input.orderItems, ShoppingMallOrderItemAtSummaryTransformer.transform),
//         };
//       }
//     }
//--------------------------------------------------------------