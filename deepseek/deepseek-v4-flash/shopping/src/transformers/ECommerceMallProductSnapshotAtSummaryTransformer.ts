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

export namespace ECommerceMallProductSnapshotAtSummaryTransformer {
  export type Payload = Prisma.e_commerce_mall_product_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        base_price: true,
        created_at: true,
        product: ECommerceMallProductAtSummaryTransformer.select(),
        category: ECommerceMallCategoryAtSummaryTransformer.select(),
        _count: {
          select: {
            variantSnapshots: true,
            snapshotImages: true,
          },
        },
      },
    } satisfies Prisma.e_commerce_mall_product_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IECommerceMallProductSnapshot.ISummary> {
    return {
      id: input.id,
      name: input.name,
      base_price: input.base_price,
      product: await ECommerceMallProductAtSummaryTransformer.transform(
        input.product,
      ),
      category: input.category
        ? await ECommerceMallCategoryAtSummaryTransformer.transform(
            input.category,
          )
        : null,
      variants_count: input._count.variantSnapshots,
      images_count: input._count.snapshotImages,
      created_at: input.created_at.toISOString(),
    };
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ECommerceMallProductSnapshotAtSummaryTransformer {
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
//           },
//         } satisfies Prisma.e_commerce_mall_product_snapshotsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IECommerceMallProductSnapshot.ISummary> {
//         return {
//   id: {string},
//   name: {string},
//   base_price: {number},
//   product: await ECommerceMallProductAtSummaryTransformer.transform(input.product),
//   category: input.category ? await ECommerceMallCategoryAtSummaryTransformer.transform(input.category) : null,
//   variants_count: {integer},
//   images_count: {integer},
//   created_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------