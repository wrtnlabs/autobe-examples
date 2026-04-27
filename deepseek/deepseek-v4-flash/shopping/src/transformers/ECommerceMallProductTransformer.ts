import { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import { IECommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrder";
import { IECommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItem";
import { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
import { IECommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductImage";
import { IECommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariant";
import { IECommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariantOption";
import { IECommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallReview";
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
import { ECommerceMallProductImageTransformer } from "./ECommerceMallProductImageTransformer";
import { ECommerceMallProductVariantTransformer } from "./ECommerceMallProductVariantTransformer";
import { ECommerceMallReviewTransformer } from "./ECommerceMallReviewTransformer";
import { ECommerceMallSellerAtSummaryTransformer } from "./ECommerceMallSellerAtSummaryTransformer";

export namespace ECommerceMallProductTransformer {
  export type Payload = Prisma.e_commerce_mall_productsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        description: true,
        base_price: true,
        visibility: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        seller: ECommerceMallSellerAtSummaryTransformer.select(),
        category: ECommerceMallCategoryAtSummaryTransformer.select(),
        images: ECommerceMallProductImageTransformer.select(),
        variants: ECommerceMallProductVariantTransformer.select(),
        reviews: ECommerceMallReviewTransformer.select(),
      },
    } satisfies Prisma.e_commerce_mall_productsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IECommerceMallProduct> {
    const average_rating: number | null =
      input.reviews.length > 0
        ? Number(
            (
              input.reviews.reduce((sum, r) => sum + r.rating, 0) /
              input.reviews.length
            ).toFixed(1),
          )
        : null;
    return {
      id: input.id,
      name: input.name,
      description: input.description,
      base_price: input.base_price,
      visibility: input.visibility,
      seller: await ECommerceMallSellerAtSummaryTransformer.transform(
        input.seller,
      ),
      category: input.category
        ? await ECommerceMallCategoryAtSummaryTransformer.transform(
            input.category,
          )
        : undefined,
      images: await ArrayUtil.asyncMap(
        input.images,
        ECommerceMallProductImageTransformer.transform,
      ),
      variants: await ArrayUtil.asyncMap(
        input.variants,
        ECommerceMallProductVariantTransformer.transform,
      ),
      reviews: await ArrayUtil.asyncMap(
        input.reviews,
        ECommerceMallReviewTransformer.transform,
      ),
      average_rating,
      review_count: input.reviews.length,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? undefined,
    } satisfies IECommerceMallProduct;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ECommerceMallProductTransformer {
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
//             images: ECommerceMallProductImageTransformer.select(),
//             reviews: ECommerceMallReviewTransformer.select(),
//             ...
//           },
//         } satisfies Prisma.e_commerce_mall_productsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IECommerceMallProduct> {
//         return {
//   id: {string},
//   name: {string},
//   description: {string},
//   base_price: {number},
//   visibility: {string},
//   seller: await ECommerceMallSellerAtSummaryTransformer.transform(input.seller),
//   category: input.category ? await ECommerceMallCategoryAtSummaryTransformer.transform(input.category) : null,
//   images: await ArrayUtil.asyncMap(input.images, ECommerceMallProductImageTransformer.transform),
//   variants: {Array<IECommerceMallProductVariant>},
//   reviews: await ArrayUtil.asyncMap(input.reviews, ECommerceMallReviewTransformer.transform),
//   average_rating: {number | null},
//   review_count: {integer},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------