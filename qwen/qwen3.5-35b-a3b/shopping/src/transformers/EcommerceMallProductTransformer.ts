import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import { IEcommerceMallProductReviewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductReviewStat";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallCategoryAtSummaryTransformer } from "./EcommerceMallCategoryAtSummaryTransformer";
import { EcommerceMallProductImageAtSummaryTransformer } from "./EcommerceMallProductImageAtSummaryTransformer";
import { EcommerceMallProductReviewStatTransformer } from "./EcommerceMallProductReviewStatTransformer";
import { EcommerceMallProductVariantAtSummaryTransformer } from "./EcommerceMallProductVariantAtSummaryTransformer";
import { EcommerceMallSellerAtSummaryTransformer } from "./EcommerceMallSellerAtSummaryTransformer";

export namespace EcommerceMallProductTransformer {
  export type Payload = Prisma.ecommerce_mall_productsGetPayload<
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
        updated_at: true,
        deleted_at: true,
        category: EcommerceMallCategoryAtSummaryTransformer.select(),
        seller: EcommerceMallSellerAtSummaryTransformer.select(),
        images: EcommerceMallProductImageAtSummaryTransformer.select(),
        variants: EcommerceMallProductVariantAtSummaryTransformer.select(),
        reviewStat: EcommerceMallProductReviewStatTransformer.select(),
      },
    } satisfies Prisma.ecommerce_mall_productsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallProduct> {
    // Handle nullable hasOne relation reviewStat
    const reviewStats: IEcommerceMallProductReviewStat = input.reviewStat
      ? await EcommerceMallProductReviewStatTransformer.transform(
          input.reviewStat,
        )
      : {
          id: input.id,
          ecommerce_mall_product_id: input.id,
          average_rating: null,
          review_count: 0,
          rating_1_count: 0,
          rating_2_count: 0,
          rating_3_count: 0,
          rating_4_count: 0,
          rating_5_count: 0,
          created_at: input.created_at.toISOString(),
          updated_at: input.updated_at.toISOString(),
        };
    return {
      id: input.id,
      name: input.name,
      description: input.description,
      base_price: Number(input.base_price),
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at:
        input.deleted_at !== null && input.deleted_at !== undefined
          ? toISOStringSafe(input.deleted_at)
          : null,
      category: await EcommerceMallCategoryAtSummaryTransformer.transform(
        input.category,
      ),
      seller: await EcommerceMallSellerAtSummaryTransformer.transform(
        input.seller,
      ),
      images: await ArrayUtil.asyncMap(
        input.images,
        EcommerceMallProductImageAtSummaryTransformer.transform,
      ),
      variants: await ArrayUtil.asyncMap(
        input.variants,
        EcommerceMallProductVariantAtSummaryTransformer.transform,
      ),
      reviewStats,
    } satisfies IEcommerceMallProduct;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallProductTransformer {
//       export type Payload = Prisma.ecommerce_mall_productsGetPayload<ReturnType<typeof select>>;
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
//             updated_at: true,
//             deleted_at: true,
//             category: EcommerceMallCategoryAtSummaryTransformer.select(),
//             seller: EcommerceMallSellerAtSummaryTransformer.select(),
//             variants: EcommerceMallProductVariantAtSummaryTransformer.select(),
//             images: EcommerceMallProductImageAtSummaryTransformer.select(),
//             reviewStat: EcommerceMallProductReviewStatTransformer.select(),
//           },
//         } satisfies Prisma.ecommerce_mall_productsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallProduct> {
//         return {
//   id: {string},
//   name: {string},
//   description: {string},
//   base_price: {number},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//   category: await EcommerceMallCategoryAtSummaryTransformer.transform(input.category),
//   seller: await EcommerceMallSellerAtSummaryTransformer.transform(input.seller),
//   variants: await ArrayUtil.asyncMap(input.variants, EcommerceMallProductVariantAtSummaryTransformer.transform),
//   images: await ArrayUtil.asyncMap(input.images, EcommerceMallProductImageAtSummaryTransformer.transform),
//   reviewStats: await EcommerceMallProductReviewStatTransformer.transform(input.reviewStat),
//         };
//       }
//     }
//--------------------------------------------------------------