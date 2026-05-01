import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrderItemProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemProductSnapshot";
import { IShoppingMallOrderItemProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemProductSnapshotImage";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallOrderItemProductSnapshotAtSummaryTransformer } from "./ShoppingMallOrderItemProductSnapshotAtSummaryTransformer";

export namespace ShoppingMallOrderItemProductSnapshotImageTransformer {
  export type Payload =
    Prisma.shopping_mall_order_item_product_snapshot_imagesGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        image_url: true,
        display_order: true,
        created_at: true,
        productSnapshot:
          ShoppingMallOrderItemProductSnapshotAtSummaryTransformer.select(),
      },
    } satisfies Prisma.shopping_mall_order_item_product_snapshot_imagesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallOrderItemProductSnapshotImage> {
    return {
      id: input.id,
      productSnapshot:
        await ShoppingMallOrderItemProductSnapshotAtSummaryTransformer.transform(
          input.productSnapshot,
        ),
      imageUrl: input.image_url,
      displayOrder: input.display_order,
      createdAt: input.created_at.toISOString(),
    } satisfies IShoppingMallOrderItemProductSnapshotImage;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ShoppingMallOrderItemProductSnapshotImageTransformer {
//       export type Payload = Prisma.shopping_mall_order_item_product_snapshot_imagesGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             image_url: true,
//             display_order: true,
//             created_at: true,
//             productSnapshot: ShoppingMallOrderItemProductSnapshotAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.shopping_mall_order_item_product_snapshot_imagesFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IShoppingMallOrderItemProductSnapshotImage> {
//         return {
//   id: {string},
//   productSnapshot: await ShoppingMallOrderItemProductSnapshotAtSummaryTransformer.transform(input.productSnapshot),
//   imageUrl: {string},
//   displayOrder: {integer},
//   createdAt: {string},
//         };
//       }
//     }
//--------------------------------------------------------------