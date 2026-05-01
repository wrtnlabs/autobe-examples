import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrderItemProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemProductSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallOrderItemProductSnapshotAtSummaryTransformer {
  export type Payload =
    Prisma.shopping_mall_order_item_product_snapshotsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        description: true,
        base_price: true,
        category_name: true,
        created_at: true,
      },
    } satisfies Prisma.shopping_mall_order_item_product_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallOrderItemProductSnapshot.ISummary> {
    return {
      id: input.id,
      name: input.name,
      description: input.description,
      basePrice: input.base_price,
      categoryName: input.category_name,
      createdAt: input.created_at.toISOString(),
    } satisfies IShoppingMallOrderItemProductSnapshot.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ShoppingMallOrderItemProductSnapshotAtSummaryTransformer {
//       export type Payload = Prisma.shopping_mall_order_item_product_snapshotsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             name: true,
//             description: true,
//             base_price: true,
//             category_name: true,
//             created_at: true,
//             shopping_mall_order_item_id: true,
//             shopping_mall_product_id: true,
//             shopping_mall_category_id: true,
//           },
//         } satisfies Prisma.shopping_mall_order_item_product_snapshotsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IShoppingMallOrderItemProductSnapshot.ISummary> {
//         return {
//   id: {string},
//   name: {string},
//   description: {string},
//   basePrice: {number},
//   categoryName: {string},
//   createdAt: {string},
//         };
//       }
//     }
//--------------------------------------------------------------