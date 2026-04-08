import { IEcommerceMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallProductSnapshotImageTransformer {
  export type Payload = Prisma.ecommerce_mall_product_snapshot_imagesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        url: true,
        display_order: true,
        created_at: true,
        updated_at: true,
        productSnapshot: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.ecommerce_mall_product_snapshot_imagesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallProductSnapshotImage> {
    return {
      id: input.id,
      url: input.url,
      displayOrder: input.display_order,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
    } satisfies IEcommerceMallProductSnapshotImage;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallProductSnapshotImageTransformer {
//       export type Payload = Prisma.ecommerce_mall_product_snapshot_imagesGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             url: true,
//             display_order: true,
//             created_at: true,
//             updated_at: true,
//             ecommerce_mall_product_snapshot_id: true,
//           },
//         } satisfies Prisma.ecommerce_mall_product_snapshot_imagesFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallProductSnapshotImage> {
//         return {
//   createdAt: {string},
//   displayOrder: {integer},
//   id: {string},
//   updatedAt: {string},
//   url: {string},
//         };
//       }
//     }
//--------------------------------------------------------------