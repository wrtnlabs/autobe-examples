import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallSellerAtSummaryTransformer } from "./EcommerceMallSellerAtSummaryTransformer";

export namespace EcommerceMallProductAtSummaryTransformer {
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
        seller: EcommerceMallSellerAtSummaryTransformer.select(),
        category: {
          select: {
            name: true,
          },
        } satisfies Prisma.ecommerce_mall_categoriesFindManyArgs,
        variants: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_mall_product_variantsFindManyArgs,
        productImages: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_mall_product_imagesFindManyArgs,
        productSnapshots: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_mall_product_snapshotsFindManyArgs,
        wishlistItems: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_mall_wishlist_itemsFindManyArgs,
        orderItems: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_mall_order_itemsFindManyArgs,
        reviews: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_mall_reviewsFindManyArgs,
      },
    } satisfies Prisma.ecommerce_mall_productsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallProduct.ISummary> {
    return {
      id: input.id,
      name: input.name,
      basePrice: Number(input.base_price),
      categoryName: input.category.name,
      hasStock: input.variants.length > 0,
      seller: await EcommerceMallSellerAtSummaryTransformer.transform(
        input.seller,
      ),
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
    } satisfies IEcommerceMallProduct.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallProductAtSummaryTransformer {
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
//             seller: EcommerceMallSellerAtSummaryTransformer.select(),
//             ecommerce_mall_category_id: true,
//           },
//         } satisfies Prisma.ecommerce_mall_productsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallProduct.ISummary> {
//         return {
//   id: {string},
//   name: {string},
//   basePrice: {number},
//   categoryName: {string},
//   hasStock: {boolean},
//   seller: await EcommerceMallSellerAtSummaryTransformer.transform(input.seller),
//   createdAt: {string},
//   updatedAt: {string},
//         };
//       }
//     }
//--------------------------------------------------------------