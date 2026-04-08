import { IEcommerceMallProductReviewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductReviewStat";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallProductReviewStatTransformer {
  export type Payload = Prisma.ecommerce_mall_product_review_statsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        average_rating: true,
        review_count: true,
        rating_1_count: true,
        rating_2_count: true,
        rating_3_count: true,
        rating_4_count: true,
        rating_5_count: true,
        created_at: true,
        updated_at: true,
        product: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_mall_productsFindManyArgs,
      },
    } satisfies Prisma.ecommerce_mall_product_review_statsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallProductReviewStat> {
    return {
      id: input.id,
      ecommerce_mall_product_id: input.product.id,
      average_rating: input.average_rating,
      review_count: Number(input.review_count),
      rating_1_count: Number(input.rating_1_count),
      rating_2_count: Number(input.rating_2_count),
      rating_3_count: Number(input.rating_3_count),
      rating_4_count: Number(input.rating_4_count),
      rating_5_count: Number(input.rating_5_count),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    } satisfies IEcommerceMallProductReviewStat;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallProductReviewStatTransformer {
//       export type Payload = Prisma.ecommerce_mall_product_review_statsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             average_rating: true,
//             review_count: true,
//             rating_5_count: true,
//             rating_4_count: true,
//             rating_3_count: true,
//             rating_2_count: true,
//             rating_1_count: true,
//             created_at: true,
//             updated_at: true,
//             ecommerce_mall_product_id: true,
//           },
//         } satisfies Prisma.ecommerce_mall_product_review_statsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallProductReviewStat> {
//         return {
//   id: {string},
//   ecommerce_mall_product_id: {string},
//   average_rating: {number | null},
//   review_count: {integer},
//   rating_1_count: {integer},
//   rating_2_count: {integer},
//   rating_3_count: {integer},
//   rating_4_count: {integer},
//   rating_5_count: {integer},
//   created_at: {string},
//   updated_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------