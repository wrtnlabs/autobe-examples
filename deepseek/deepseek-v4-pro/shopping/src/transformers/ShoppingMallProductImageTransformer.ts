import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallProductAtSummaryTransformer } from "./ShoppingMallProductAtSummaryTransformer";

export namespace ShoppingMallProductImageTransformer {
  export type Payload = Prisma.shopping_mall_product_imagesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        image_url: true,
        display_order: true,
        created_at: true,
        updated_at: true,
        product: ShoppingMallProductAtSummaryTransformer.select(),
      },
    } satisfies Prisma.shopping_mall_product_imagesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallProductImage> {
    return {
      id: input.id,
      product: await ShoppingMallProductAtSummaryTransformer.transform(
        input.product,
      ),
      image_url: input.image_url,
      display_order: input.display_order,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    };
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ShoppingMallProductImageTransformer {
//       export type Payload = Prisma.shopping_mall_product_imagesGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             image_url: true,
//             display_order: true,
//             created_at: true,
//             updated_at: true,
//             product: ShoppingMallProductAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.shopping_mall_product_imagesFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IShoppingMallProductImage> {
//         return {
//   id: {string},
//   product: await ShoppingMallProductAtSummaryTransformer.transform(input.product),
//   image_url: {string},
//   display_order: {integer},
//   created_at: {string},
//   updated_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------