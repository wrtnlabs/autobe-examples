import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import { IShoppingMallReviewReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewReview";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallCategoryAtSummaryTransformer } from "./ShoppingMallCategoryAtSummaryTransformer";
import { ShoppingMallProductImageAtSummaryTransformer } from "./ShoppingMallProductImageAtSummaryTransformer";
import { ShoppingMallProductVariantTransformer } from "./ShoppingMallProductVariantTransformer";
import { ShoppingMallReviewReviewAtSummaryTransformer } from "./ShoppingMallReviewReviewAtSummaryTransformer";
import { ShoppingMallSellerProfileAtSummaryTransformer } from "./ShoppingMallSellerProfileAtSummaryTransformer";

export namespace ShoppingMallProductAtDetailTransformer {
  export type Payload = Prisma.shopping_mall_productsGetPayload<
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
        category: ShoppingMallCategoryAtSummaryTransformer.select(),
        seller: {
          select: {
            profile: ShoppingMallSellerProfileAtSummaryTransformer.select(),
          },
        } satisfies Prisma.shopping_mall_sellersFindManyArgs,
        images: ShoppingMallProductImageAtSummaryTransformer.select(),
        variants: ShoppingMallProductVariantTransformer.select(),
        reviews: ShoppingMallReviewReviewAtSummaryTransformer.select(),
      },
    } satisfies Prisma.shopping_mall_productsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallProduct.IDetail> {
    const transformedVariants = (await ArrayUtil.asyncMap(
      input.variants,
      ShoppingMallProductVariantTransformer.transform,
    )) as IShoppingMallProductVariant[];
    const transformedReviews = (await ArrayUtil.asyncMap(
      input.reviews,
      ShoppingMallReviewReviewAtSummaryTransformer.transform,
    )) as IShoppingMallReviewReview.ISummary[];
    return {
      id: input.id,
      name: input.name,
      description: input.description,
      base_price: input.base_price,
      category: await ShoppingMallCategoryAtSummaryTransformer.transform(
        input.category,
      ),
      seller: await ShoppingMallSellerProfileAtSummaryTransformer.transform(
        input.seller.profile!,
      ),
      images: await ArrayUtil.asyncMap(
        input.images,
        ShoppingMallProductImageAtSummaryTransformer.transform,
      ),
      variants: transformedVariants,
      reviews: transformedReviews,
      average_rating:
        transformedReviews.length > 0
          ? transformedReviews.reduce((sum, r) => sum + r.rating, 0) /
            transformedReviews.length
          : null,
      review_count: transformedReviews.length,
      is_available: transformedVariants.some(
        (v) => v.deleted_at === null && v.stock_quantity > 0,
      ),
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at:
        input.deleted_at !== null ? toISOStringSafe(input.deleted_at) : null,
    } satisfies IShoppingMallProduct.IDetail;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ShoppingMallProductAtDetailTransformer {
//       export type Payload = Prisma.shopping_mall_productsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             name: true,
//             description: true,
//             base_price: true,
//             average_rating: true,
//             review_count: true,
//             is_available: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             ...
//           },
//         } satisfies Prisma.shopping_mall_productsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IShoppingMallProduct.IDetail> {
//         return {
//   id: {string},
//   name: {string},
//   description: {string},
//   base_price: {number},
//   category: {IShoppingMallCategory.ISummary},
//   seller: {IShoppingMallSellerProfile.ISummary},
//   images: {Array<IShoppingMallProductImage.ISummary>},
//   variants: {Array<IShoppingMallProductVariant>},
//   reviews: {Array<IShoppingMallReviewReview.ISummary>},
//   average_rating: {number | null},
//   review_count: {integer},
//   is_available: {boolean},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------