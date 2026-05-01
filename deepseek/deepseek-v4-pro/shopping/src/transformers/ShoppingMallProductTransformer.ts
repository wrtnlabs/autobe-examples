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
import { ShoppingMallProductImageTransformer } from "./ShoppingMallProductImageTransformer";
import { ShoppingMallProductVariantTransformer } from "./ShoppingMallProductVariantTransformer";
import { ShoppingMallReviewReviewAtSummaryTransformer } from "./ShoppingMallReviewReviewAtSummaryTransformer";
import { ShoppingMallSellerProfileAtSummaryTransformer } from "./ShoppingMallSellerProfileAtSummaryTransformer";

export namespace ShoppingMallProductTransformer {
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
        images: ShoppingMallProductImageTransformer.select(),
        variants: ShoppingMallProductVariantTransformer.select(),
        reviews: ShoppingMallReviewReviewAtSummaryTransformer.select(),
      },
    } satisfies Prisma.shopping_mall_productsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallProduct> {
    if (!input.seller.profile)
      throw new HttpException("Seller profile not found", 500);
    return {
      id: input.id,
      name: input.name,
      description: input.description,
      base_price: input.base_price,
      category: await ShoppingMallCategoryAtSummaryTransformer.transform(
        input.category,
      ),
      seller: await ShoppingMallSellerProfileAtSummaryTransformer.transform(
        input.seller.profile,
      ),
      images: await ArrayUtil.asyncMap(
        input.images,
        ShoppingMallProductImageTransformer.transform,
      ),
      variants: await ArrayUtil.asyncMap(
        input.variants,
        ShoppingMallProductVariantTransformer.transform,
      ),
      reviews: await ArrayUtil.asyncMap(
        input.reviews,
        ShoppingMallReviewReviewAtSummaryTransformer.transform,
      ),
      average_rating:
        input.reviews.length > 0
          ? input.reviews.reduce((sum, r) => sum + r.rating, 0) /
            input.reviews.length
          : null,
      review_count: input.reviews.length,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    } satisfies IShoppingMallProduct;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ShoppingMallProductTransformer {
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
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             shopping_mall_seller_id: true,
//             category: ShoppingMallCategoryAtSummaryTransformer.select(),
//             images: ShoppingMallProductImageTransformer.select(),
//             variants: ShoppingMallProductVariantTransformer.select(),
//             reviews: ShoppingMallReviewReviewAtSummaryTransformer.select(),
//             ...
//           },
//         } satisfies Prisma.shopping_mall_productsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IShoppingMallProduct> {
//         return {
//   id: {string},
//   name: {string},
//   description: {string},
//   base_price: {number},
//   category: await ShoppingMallCategoryAtSummaryTransformer.transform(input.category),
//   seller: {IShoppingMallSellerProfile.ISummary},
//   images: await ArrayUtil.asyncMap(input.images, ShoppingMallProductImageTransformer.transform),
//   variants: await ArrayUtil.asyncMap(input.variants, ShoppingMallProductVariantTransformer.transform),
//   reviews: await ArrayUtil.asyncMap(input.reviews, ShoppingMallReviewReviewAtSummaryTransformer.transform),
//   average_rating: {number | null},
//   review_count: {integer},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------