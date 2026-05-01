import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import { IShoppingMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotImage";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallProductImageAtSummaryTransformer } from "./ShoppingMallProductImageAtSummaryTransformer";

export namespace ShoppingMallProductSnapshotImageAtSummaryTransformer {
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
        snapshot: true,
        originalImage: ShoppingMallProductImageAtSummaryTransformer.select(),
      },
    } satisfies Prisma.shopping_mall_product_snapshot_imagesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallProductSnapshotImage.ISummary> {
    return {
      id: input.id,
      image_url: input.image_url,
      display_order: input.display_order,
      created_at: input.created_at.toISOString(),
      originalImage: input.originalImage
        ? await ShoppingMallProductImageAtSummaryTransformer.transform(
            input.originalImage,
          )
        : null,
    } satisfies IShoppingMallProductSnapshotImage.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ShoppingMallProductSnapshotImageAtSummaryTransformer {
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
//             originalImage: ShoppingMallProductImageAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.shopping_mall_product_snapshot_imagesFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IShoppingMallProductSnapshotImage.ISummary> {
//         return {
//   id: {string},
//   image_url: {string},
//   display_order: {integer},
//   created_at: {string},
//   originalImage: input.originalImage ? await ShoppingMallProductImageAtSummaryTransformer.transform(input.originalImage) : null,
//         };
//       }
//     }
//--------------------------------------------------------------