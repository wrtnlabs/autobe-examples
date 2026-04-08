import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrderItemSnapshotProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotProductImage";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallOrderItemSnapshotProductImageTransformer {
  export type Payload =
    Prisma.shopping_mall_order_item_snapshot_product_imagesGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        image_uri: true,
        display_order: true,
        created_at: true,
      },
    } satisfies Prisma.shopping_mall_order_item_snapshot_product_imagesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallOrderItemSnapshotProductImage> {
    return {
      id: input.id,
      image_uri: input.image_uri,
      display_order: input.display_order,
      created_at: input.created_at.toISOString(),
    };
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ShoppingMallOrderItemSnapshotProductImageTransformer {
//       export type Payload = Prisma.shopping_mall_order_item_snapshot_product_imagesGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             image_uri: true,
//             display_order: true,
//             created_at: true,
//             shopping_mall_order_item_snapshot_id: true,
//           },
//         } satisfies Prisma.shopping_mall_order_item_snapshot_product_imagesFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IShoppingMallOrderItemSnapshotProductImage> {
//         return {
//   id: {string},
//   image_uri: {string},
//   display_order: {integer},
//   created_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------