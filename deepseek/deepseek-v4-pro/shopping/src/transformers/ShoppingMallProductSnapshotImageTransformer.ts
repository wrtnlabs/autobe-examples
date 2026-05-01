import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotImage";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallProductSnapshotImageTransformer {
  export type Payload = Prisma.shopping_mall_product_snapshot_imagesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        image_url: true,
        display_order: true,
        created_at: true,
        snapshot: {
          select: {
            id: true,
          },
        },
        originalImage: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.shopping_mall_product_snapshot_imagesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallProductSnapshotImage> {
    return {
      id: input.id,
      shoppingMallProductSnapshotId: input.snapshot.id,
      shoppingMallProductImageId: input.originalImage?.id ?? null,
      imageUrl: input.image_url,
      displayOrder: input.display_order,
      createdAt: input.created_at.toISOString(),
    } satisfies IShoppingMallProductSnapshotImage;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ShoppingMallProductSnapshotImageTransformer {
//       export type Payload = Prisma.shopping_mall_product_snapshot_imagesGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             image_url: true,
//             display_order: true,
//             created_at: true,
//             shopping_mall_product_snapshot_id: true,
//             shopping_mall_product_image_id: true,
//           },
//         } satisfies Prisma.shopping_mall_product_snapshot_imagesFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IShoppingMallProductSnapshotImage> {
//         return {
//   id: {string},
//   shoppingMallProductSnapshotId: {string},
//   shoppingMallProductImageId: {string | null},
//   imageUrl: {string},
//   displayOrder: {integer},
//   createdAt: {string},
//         };
//       }
//     }
//--------------------------------------------------------------