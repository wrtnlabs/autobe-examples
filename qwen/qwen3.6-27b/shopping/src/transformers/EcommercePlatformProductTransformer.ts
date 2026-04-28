import { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
import { IEcommercePlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductImage";
import { IEcommercePlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariant";
import { IEcommercePlatformProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariantOption";
import { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommercePlatformCategoryAtSummaryTransformer } from "./EcommercePlatformCategoryAtSummaryTransformer";
import { EcommercePlatformProductImageTransformer } from "./EcommercePlatformProductImageTransformer";
import { EcommercePlatformProductVariantTransformer } from "./EcommercePlatformProductVariantTransformer";
import { EcommercePlatformSellerProfileAtSummaryTransformer } from "./EcommercePlatformSellerProfileAtSummaryTransformer";

export namespace EcommercePlatformProductTransformer {
  export type Payload = Prisma.ecommerce_platform_productsGetPayload<
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
        sellerProfile:
          EcommercePlatformSellerProfileAtSummaryTransformer.select(),
        category: EcommercePlatformCategoryAtSummaryTransformer.select(),
        variants: EcommercePlatformProductVariantTransformer.select(),
        images: EcommercePlatformProductImageTransformer.select(),
        _count: {
          select: {
            wishlistItems: true,
          },
        },
      },
    } satisfies Prisma.ecommerce_platform_productsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommercePlatformProduct> {
    const variants = await ArrayUtil.asyncMap(
      input.variants,
      EcommercePlatformProductVariantTransformer.transform,
    );
    const prices = variants
      .map((v) => v.price)
      .filter((p): p is number => p !== null);
    return {
      id: input.id,
      name: input.name,
      description: input.description,
      base_price: input.base_price,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      seller:
        await EcommercePlatformSellerProfileAtSummaryTransformer.transform(
          input.sellerProfile,
        ),
      category: await EcommercePlatformCategoryAtSummaryTransformer.transform(
        input.category,
      ),
      variants,
      images: await ArrayUtil.asyncMap(
        input.images,
        EcommercePlatformProductImageTransformer.transform,
      ),
      min_variant_price: prices.length > 0 ? Math.min(...prices) : null,
      max_variant_price: prices.length > 0 ? Math.max(...prices) : null,
      wishlist_count: input._count.wishlistItems,
    };
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommercePlatformProductTransformer {
//       export type Payload = Prisma.ecommerce_platform_productsGetPayload<ReturnType<typeof select>>;
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
//             sellerProfile: EcommercePlatformSellerProfileAtSummaryTransformer.select(),
//             category: EcommercePlatformCategoryAtSummaryTransformer.select(),
//             images: EcommercePlatformProductImageTransformer.select(),
//             ...
//           },
//         } satisfies Prisma.ecommerce_platform_productsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommercePlatformProduct> {
//         return {
//   id: {string},
//   name: {string},
//   description: {string},
//   base_price: {number},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//   seller: await EcommercePlatformSellerProfileAtSummaryTransformer.transform(input.sellerProfile),
//   category: await EcommercePlatformCategoryAtSummaryTransformer.transform(input.category),
//   variants: {Array<IEcommercePlatformProductVariant>},
//   images: await ArrayUtil.asyncMap(input.images, EcommercePlatformProductImageTransformer.transform),
//   min_variant_price: {number | null},
//   max_variant_price: {number | null},
//   wishlist_count: {integer},
//         };
//       }
//     }
//--------------------------------------------------------------