import { IEcommerceMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallProductSnapshotImageAtSummaryTransformer {
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
      },
    } satisfies Prisma.ecommerce_mall_product_snapshot_imagesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallProductSnapshotImage.ISummary> {
    return {
      id: input.id,
      url: input.url,
      display_order: input.display_order,
      created_at: input.created_at.toISOString(),
    };
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallProductSnapshotImageAtSummaryTransformer {
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
//             ecommerce_mall_product_snapshot_id: true,
//           },
//         } satisfies Prisma.ecommerce_mall_product_snapshot_imagesFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallProductSnapshotImage.ISummary> {
//         return {
//   id: {string},
//   url: {string},
//   display_order: {integer},
//   created_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------