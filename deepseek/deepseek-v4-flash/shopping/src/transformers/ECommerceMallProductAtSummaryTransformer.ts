import { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
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
import { ECommerceMallSellerAtSummaryTransformer } from "./ECommerceMallSellerAtSummaryTransformer";

export namespace ECommerceMallProductAtSummaryTransformer {
  export type Payload = Prisma.e_commerce_mall_productsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        base_price: true,
        visibility: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        seller: ECommerceMallSellerAtSummaryTransformer.select(),
        category: ECommerceMallCategoryAtSummaryTransformer.select(),
        images: {
          select: {
            url: true,
            sort_order: true,
          },
          orderBy: {
            sort_order: "asc",
          },
          take: 1,
        } satisfies Prisma.e_commerce_mall_product_imagesFindManyArgs,
        reviews: {
          select: {
            rating: true,
          },
          where: {
            deleted_at: null,
          },
        } satisfies Prisma.e_commerce_mall_reviewsFindManyArgs,
      },
    } satisfies Prisma.e_commerce_mall_productsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IECommerceMallProduct.ISummary> {
    const ratings = input.reviews.map((r) => r.rating);
    const averageRating =
      ratings.length > 0
        ? Math.round(
            (ratings.reduce((sum, r) => sum + r, 0) / ratings.length) * 10,
          ) / 10
        : null;
    return {
      id: input.id,
      name: input.name,
      base_price: input.base_price,
      thumbnail: input.images[0]?.url ?? null,
      visibility: input.visibility,
      seller: await ECommerceMallSellerAtSummaryTransformer.transform(
        input.seller,
      ),
      category: input.category
        ? await ECommerceMallCategoryAtSummaryTransformer.transform(
            input.category,
          )
        : null,
      average_rating: averageRating,
      review_count: ratings.length,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    } satisfies IECommerceMallProduct.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ECommerceMallProductAtSummaryTransformer {
//       export type Payload = Prisma.e_commerce_mall_productsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             name: true,
//             description: true,
//             base_price: true,
//             visibility: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             seller: ECommerceMallSellerAtSummaryTransformer.select(),
//             category: ECommerceMallCategoryAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.e_commerce_mall_productsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IECommerceMallProduct.ISummary> {
//         return {
//   id: {string},
//   name: {string},
//   base_price: {number},
//   thumbnail: {string | null},
//   visibility: {string},
//   seller: await ECommerceMallSellerAtSummaryTransformer.transform(input.seller),
//   category: input.category ? await ECommerceMallCategoryAtSummaryTransformer.transform(input.category) : null,
//   average_rating: {number | null},
//   review_count: {integer},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------