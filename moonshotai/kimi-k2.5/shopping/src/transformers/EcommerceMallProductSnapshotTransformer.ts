import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import { IEcommerceMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallCategoryAtSummaryTransformer } from "./EcommerceMallCategoryAtSummaryTransformer";
import { EcommerceMallProductSnapshotImageAtSummaryTransformer } from "./EcommerceMallProductSnapshotImageAtSummaryTransformer";

export namespace EcommerceMallProductSnapshotTransformer {
  export type Payload = Prisma.ecommerce_mall_product_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        description: true,
        base_price: true,
        created_at: true,
        category: EcommerceMallCategoryAtSummaryTransformer.select(),
        images: EcommerceMallProductSnapshotImageAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_mall_product_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallProductSnapshot> {
    return {
      id: input.id,
      name: input.name,
      description: input.description,
      basePrice: input.base_price,
      createdAt: input.created_at.toISOString(),
      category: await EcommerceMallCategoryAtSummaryTransformer.transform(
        input.category,
      ),
      images: await ArrayUtil.asyncMap(
        input.images,
        EcommerceMallProductSnapshotImageAtSummaryTransformer.transform,
      ),
    } satisfies IEcommerceMallProductSnapshot;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallProductSnapshotTransformer {
//       export type Payload = Prisma.ecommerce_mall_product_snapshotsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             name: true,
//             description: true,
//             base_price: true,
//             created_at: true,
//             product_id: true,
//             category: EcommerceMallCategoryAtSummaryTransformer.select(),
//             images: EcommerceMallProductSnapshotImageAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.ecommerce_mall_product_snapshotsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallProductSnapshot> {
//         return {
//   id: {string},
//   name: {string},
//   description: {string},
//   basePrice: {number},
//   createdAt: {string},
//   category: await EcommerceMallCategoryAtSummaryTransformer.transform(input.category),
//   images: await ArrayUtil.asyncMap(input.images, EcommerceMallProductSnapshotImageAtSummaryTransformer.transform),
//         };
//       }
//     }
//--------------------------------------------------------------