import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import { IEcommerceMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotVariant";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallCategoryTransformer } from "./EcommerceMallCategoryTransformer";
import { EcommerceMallProductImageTransformer } from "./EcommerceMallProductImageTransformer";
import { EcommerceMallProductVariantTransformer } from "./EcommerceMallProductVariantTransformer";
import { EcommerceMallReviewTransformer } from "./EcommerceMallReviewTransformer";
import { EcommerceMallSellerProfileTransformer } from "./EcommerceMallSellerProfileTransformer";

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
        seller: EcommerceMallSellerProfileTransformer.select(),
        category: EcommerceMallCategoryTransformer.select(),
        productImages: EcommerceMallProductImageTransformer.select(),
        variants: EcommerceMallProductVariantTransformer.select(),
        reviews: EcommerceMallReviewTransformer.select(),
        productSnapshots: {
          select: { id: true },
        } satisfies Prisma.ecommerce_mall_product_snapshotsFindManyArgs,
        wishlistItems: {
          select: { id: true },
        } satisfies Prisma.ecommerce_mall_wishlist_itemsFindManyArgs,
        orderItems: {
          select: { id: true },
        } satisfies Prisma.ecommerce_mall_order_itemsFindManyArgs,
      },
    } satisfies Prisma.ecommerce_mall_productsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallProduct> {
    return {
      id: input.id,
      name: input.name,
      description: input.description,
      basePrice: input.base_price,
      seller: await EcommerceMallSellerProfileTransformer.transform(
        input.seller,
      ),
      category: await EcommerceMallCategoryTransformer.transform(
        input.category,
      ),
      productImages: await ArrayUtil.asyncMap(
        input.productImages,
        EcommerceMallProductImageTransformer.transform,
      ),
      variants: await ArrayUtil.asyncMap(
        input.variants,
        EcommerceMallProductVariantTransformer.transform,
      ),
      reviews: await ArrayUtil.asyncMap(
        input.reviews,
        EcommerceMallReviewTransformer.transform,
      ),
      reviewsCount: input.reviews.length,
      averageRating:
        input.reviews.length > 0
          ? input.reviews.reduce((sum, r) => sum + r.rating, 0) /
            input.reviews.length
          : 0,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
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
//             ecommerce_mall_seller_id: true,
//             ecommerce_mall_category_id: true,
//             productImages: EcommerceMallProductImageTransformer.select(),
//             reviews: EcommerceMallReviewTransformer.select(),
//             ...
//           },
//         } satisfies Prisma.ecommerce_mall_productsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallProduct> {
//         return {
//   id: {string},
//   name: {string},
//   description: {string},
//   basePrice: {number},
//   seller: {IEcommerceMallSellerProfile},
//   category: {IEcommerceMallCategory},
//   productImages: await ArrayUtil.asyncMap(input.productImages, EcommerceMallProductImageTransformer.transform),
//   variants: {Array<IEcommerceMallProductVariant>},
//   reviews: await ArrayUtil.asyncMap(input.reviews, EcommerceMallReviewTransformer.transform),
//   reviewsCount: {integer},
//   averageRating: {number},
//   createdAt: {string},
//   updatedAt: {string},
//   deletedAt: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------