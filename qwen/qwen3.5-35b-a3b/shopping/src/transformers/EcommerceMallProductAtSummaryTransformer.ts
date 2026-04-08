import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallCategoryAtSummaryTransformer } from "./EcommerceMallCategoryAtSummaryTransformer";
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
        category: EcommerceMallCategoryAtSummaryTransformer.select(),
        seller: EcommerceMallSellerAtSummaryTransformer.select(),
        wishlistItems: true,
        customerReviews: true,
        images: true,
        variants: {
          select: {
            stock_quantity: true,
          },
        } satisfies Prisma.ecommerce_mall_product_variantsFindManyArgs,
        reviews: true,
        reviewSnapshots: true,
        reviewStat: {
          select: {
            average_rating: true,
          },
        } satisfies Prisma.ecommerce_mall_product_review_statsFindManyArgs,
        snapshots: true,
        productSnapshots: true,
        variantSnapshots: true,
      },
    } satisfies Prisma.ecommerce_mall_productsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallProduct.ISummary> {
    const hasInStock = input.variants.some((v) => (v.stock_quantity ?? 0) > 0);
    return {
      id: input.id,
      name: input.name,
      description: input.description ?? undefined,
      base_price: Number(input.base_price),
      category: await EcommerceMallCategoryAtSummaryTransformer.transform(
        input.category,
      ),
      seller: await EcommerceMallSellerAtSummaryTransformer.transform(
        input.seller,
      ),
      availability_status: hasInStock ? "available" : "unavailable",
      has_available_variants: hasInStock,
      average_rating: input.reviewStat?.average_rating ?? undefined,
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
//             category: EcommerceMallCategoryAtSummaryTransformer.select(),
//             seller: EcommerceMallSellerAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.ecommerce_mall_productsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallProduct.ISummary> {
//         return {
//   id: {string},
//   name: {string},
//   description: {string},
//   base_price: {number},
//   category: await EcommerceMallCategoryAtSummaryTransformer.transform(input.category),
//   seller: await EcommerceMallSellerAtSummaryTransformer.transform(input.seller),
//   availability_status: {"available" | "unavailable"},
//   has_available_variants: {boolean},
//   average_rating: {number},
//         };
//       }
//     }
//--------------------------------------------------------------