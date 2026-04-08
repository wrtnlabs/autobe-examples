import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallCategoryTransformer } from "./EcommerceMallCategoryTransformer";
import { EcommerceMallProductImageTransformer } from "./EcommerceMallProductImageTransformer";
import { EcommerceMallProductVariantTransformer } from "./EcommerceMallProductVariantTransformer";
import { EcommerceMallSellerProfileTransformer } from "./EcommerceMallSellerProfileTransformer";

export namespace EcommerceMallProductAtEnrichedTransformer {
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
        seller: EcommerceMallSellerProfileTransformer.select(),
        category: EcommerceMallCategoryTransformer.select(),
        productImages: EcommerceMallProductImageTransformer.select(),
        variants: EcommerceMallProductVariantTransformer.select(),
        reviews: {
          select: {
            rating: true,
          },
        } satisfies Prisma.ecommerce_mall_reviewsFindManyArgs,
        productSnapshots: true,
        wishlistItems: true,
        orderItems: true,
      },
    } satisfies Prisma.ecommerce_mall_productsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallProduct.IEnriched> {
    const averageRating =
      input.reviews.length > 0
        ? input.reviews.reduce((sum, r) => sum + r.rating, 0) /
          input.reviews.length
        : 0;
    return {
      id: input.id,
      name: input.name,
      description: input.description,
      basePrice: Number(input.base_price),
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      category: await EcommerceMallCategoryTransformer.transform(
        input.category,
      ),
      seller: await EcommerceMallSellerProfileTransformer.transform(
        input.seller,
      ),
      images: await ArrayUtil.asyncMap(
        input.productImages,
        EcommerceMallProductImageTransformer.transform,
      ),
      variants: await ArrayUtil.asyncMap(
        input.variants,
        EcommerceMallProductVariantTransformer.transform,
      ),
      averageRating,
      reviewCount: input.reviews.length,
    } satisfies IEcommerceMallProduct.IEnriched;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallProductAtEnrichedTransformer {
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
//             ecommerce_mall_seller_id: true,
//             ecommerce_mall_category_id: true,
//             variants: EcommerceMallProductVariantTransformer.select(),
//             productImages: EcommerceMallProductImageTransformer.select(),
//             ...
//           },
//         } satisfies Prisma.ecommerce_mall_productsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallProduct.IEnriched> {
//         return {
//   id: {string},
//   name: {string},
//   description: {string},
//   basePrice: {number},
//   createdAt: {string},
//   updatedAt: {string},
//   category: {IEcommerceMallCategory},
//   seller: {IEcommerceMallSellerProfile},
//   images: await ArrayUtil.asyncMap(input.productImages, EcommerceMallProductImageTransformer.transform),
//   variants: await ArrayUtil.asyncMap(input.variants, EcommerceMallProductVariantTransformer.transform),
//   averageRating: {number},
//   reviewCount: {integer},
//         };
//       }
//     }
//--------------------------------------------------------------