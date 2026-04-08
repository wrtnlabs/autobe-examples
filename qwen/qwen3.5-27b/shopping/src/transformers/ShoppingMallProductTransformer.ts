import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
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
import { ShoppingMallSellerAtSummaryTransformer } from "./ShoppingMallSellerAtSummaryTransformer";

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
        seller: ShoppingMallSellerAtSummaryTransformer.select(),
        category: ShoppingMallCategoryAtSummaryTransformer.select(),
        images: ShoppingMallProductImageTransformer.select(),
        variants: ShoppingMallProductVariantTransformer.select(),
        _count: { select: { reviews: true } },
      },
    } satisfies Prisma.shopping_mall_productsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallProduct> {
    return {
      id: input.id,
      name: input.name,
      description: input.description,
      base_price: input.base_price,
      seller: await ShoppingMallSellerAtSummaryTransformer.transform(
        input.seller,
      ),
      category: input.category
        ? await ShoppingMallCategoryAtSummaryTransformer.transform(
            input.category,
          )
        : null,
      images: await ArrayUtil.asyncMap(
        input.images,
        ShoppingMallProductImageTransformer.transform,
      ),
      variants: await ArrayUtil.asyncMap(
        input.variants,
        ShoppingMallProductVariantTransformer.transform,
      ),
      reviews_count: input._count.reviews,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
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
//             seller: ShoppingMallSellerAtSummaryTransformer.select(),
//             category: ShoppingMallCategoryAtSummaryTransformer.select(),
//             images: ShoppingMallProductImageTransformer.select(),
//             variants: ShoppingMallProductVariantTransformer.select(),
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
//   seller: await ShoppingMallSellerAtSummaryTransformer.transform(input.seller),
//   category: input.category ? await ShoppingMallCategoryAtSummaryTransformer.transform(input.category) : null,
//   images: await ArrayUtil.asyncMap(input.images, ShoppingMallProductImageTransformer.transform),
//   variants: await ArrayUtil.asyncMap(input.variants, ShoppingMallProductVariantTransformer.transform),
//   reviews_count: {integer},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------