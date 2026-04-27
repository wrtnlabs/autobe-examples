import { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
import { IECommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductSnapshot";
import { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ECommerceMallCategoryAtSummaryTransformer } from "./ECommerceMallCategoryAtSummaryTransformer";
import { ECommerceMallProductAtSummaryTransformer } from "./ECommerceMallProductAtSummaryTransformer";
import { ECommerceMallProductSnapshotAtImageTransformer } from "./ECommerceMallProductSnapshotAtImageTransformer";
import { ECommerceMallProductSnapshotAtVariantTransformer } from "./ECommerceMallProductSnapshotAtVariantTransformer";

export namespace ECommerceMallProductSnapshotTransformer {
  export type Payload = Prisma.e_commerce_mall_product_snapshotsGetPayload<
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
        product: ECommerceMallProductAtSummaryTransformer.select(),
        category: ECommerceMallCategoryAtSummaryTransformer.select(),
        variantSnapshots:
          ECommerceMallProductSnapshotAtVariantTransformer.select(),
        snapshotImages: ECommerceMallProductSnapshotAtImageTransformer.select(),
      },
    } satisfies Prisma.e_commerce_mall_product_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IECommerceMallProductSnapshot> {
    return {
      id: input.id,
      product: await ECommerceMallProductAtSummaryTransformer.transform(
        input.product,
      ),
      category: input.category
        ? await ECommerceMallCategoryAtSummaryTransformer.transform(
            input.category,
          )
        : null,
      name: input.name,
      description: input.description,
      base_price: input.base_price,
      created_at: input.created_at.toISOString(),
      variants: await ArrayUtil.asyncMap(
        input.variantSnapshots,
        ECommerceMallProductSnapshotAtVariantTransformer.transform,
      ),
      images: await ArrayUtil.asyncMap(
        input.snapshotImages,
        ECommerceMallProductSnapshotAtImageTransformer.transform,
      ),
    };
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ECommerceMallProductSnapshotTransformer {
//       export type Payload = Prisma.e_commerce_mall_product_snapshotsGetPayload<ReturnType<typeof select>>;
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
//             product: ECommerceMallProductAtSummaryTransformer.select(),
//             category: ECommerceMallCategoryAtSummaryTransformer.select(),
//             snapshotImages: ECommerceMallProductSnapshotAtImageTransformer.select(),
//             variantSnapshots: ECommerceMallProductSnapshotAtVariantTransformer.select(),
//           },
//         } satisfies Prisma.e_commerce_mall_product_snapshotsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IECommerceMallProductSnapshot> {
//         return {
//   id: {string},
//   product: await ECommerceMallProductAtSummaryTransformer.transform(input.product),
//   category: input.category ? await ECommerceMallCategoryAtSummaryTransformer.transform(input.category) : null,
//   name: {string},
//   description: {string},
//   base_price: {number},
//   created_at: {string},
//   variants: await ArrayUtil.asyncMap(input.variantSnapshots, ECommerceMallProductSnapshotAtVariantTransformer.transform),
//   images: await ArrayUtil.asyncMap(input.snapshotImages, ECommerceMallProductSnapshotAtImageTransformer.transform),
//         };
//       }
//     }
//--------------------------------------------------------------