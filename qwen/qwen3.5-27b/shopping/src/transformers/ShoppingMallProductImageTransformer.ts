import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallProductImageTransformer {
  export type Payload = Prisma.shopping_mall_product_imagesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        display_order: true,
        image_uri: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        product: { select: {} },
      },
    } satisfies Prisma.shopping_mall_product_imagesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallProductImage> {
    return {
      id: input.id,
      display_order: input.display_order,
      image_uri: input.image_uri,
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
//             display_order: true,
//             image_uri: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             shopping_mall_product_id: true,
//           },
//         } satisfies Prisma.shopping_mall_product_imagesFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IShoppingMallProductImage> {
//         return {
//   id: {string},
//   display_order: {integer},
//   image_uri: {string},
//   created_at: {string},
//   updated_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------