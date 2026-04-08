import { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallProductSnapshotAtProductSnapshotImageTransformer {
  // 1. Payload type first
  export type Payload = Prisma.ecommerce_mall_product_snapshot_imagesGetPayload<
    ReturnType<typeof select>
  >;
  // 2. select() function second
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
        } satisfies Prisma.ecommerce_mall_product_snapshotsFindManyArgs,
      },
    } satisfies Prisma.ecommerce_mall_product_snapshot_imagesFindManyArgs;
  }
  // 3. transform() function last
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallProductSnapshot.IProductSnapshotImage> {
    return {
      id: input.id,
      url: input.url,
      display_order: input.display_order,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    } satisfies IEcommerceMallProductSnapshot.IProductSnapshotImage;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallProductSnapshotAtProductSnapshotImageTransformer {
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
//       export async function transform(input: Payload): Promise<IEcommerceMallProductSnapshot.IProductSnapshotImage> {
//         return {
//   id: {string},
//   url: {string},
//   display_order: {integer},
//   created_at: {string},
//   updated_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------