import { IECommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ECommerceMallProductSnapshotAtImageTransformer {
  export type Payload =
    Prisma.e_commerce_mall_product_snapshot_imagesGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        url: true,
        sort_order: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        productSnapshot: {
          select: {
            id: true,
          },
        } satisfies Prisma.e_commerce_mall_product_snapshotsFindManyArgs,
      },
    } satisfies Prisma.e_commerce_mall_product_snapshot_imagesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IECommerceMallProductSnapshot.IImage> {
    return {
      id: input.id,
      url: input.url,
      sort_order: input.sort_order,
      created_at: input.created_at.toISOString(),
    } satisfies IECommerceMallProductSnapshot.IImage;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ECommerceMallProductSnapshotAtImageTransformer {
//       export type Payload = Prisma.e_commerce_mall_product_snapshot_imagesGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             url: true,
//             sort_order: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             e_commerce_mall_product_snapshot_id: true,
//           },
//         } satisfies Prisma.e_commerce_mall_product_snapshot_imagesFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IECommerceMallProductSnapshot.IImage> {
//         return {
//   id: {string},
//   url: {string},
//   sort_order: {integer},
//   created_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------