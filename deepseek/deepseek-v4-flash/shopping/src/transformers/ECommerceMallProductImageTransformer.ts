import { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
import { IECommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductImage";
import { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ECommerceMallProductAtSummaryTransformer } from "./ECommerceMallProductAtSummaryTransformer";

export namespace ECommerceMallProductImageTransformer {
  export type Payload = Prisma.e_commerce_mall_product_imagesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        url: true,
        sort_order: true,
        created_at: true,
        updated_at: true,
        product: ECommerceMallProductAtSummaryTransformer.select(),
      },
    } satisfies Prisma.e_commerce_mall_product_imagesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IECommerceMallProductImage> {
    return {
      id: input.id,
      url: input.url,
      sort_order: input.sort_order,
      product: await ECommerceMallProductAtSummaryTransformer.transform(
        input.product,
      ),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    } satisfies IECommerceMallProductImage;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ECommerceMallProductImageTransformer {
//       export type Payload = Prisma.e_commerce_mall_product_imagesGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             url: true,
//             sort_order: true,
//             created_at: true,
//             updated_at: true,
//             product: ECommerceMallProductAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.e_commerce_mall_product_imagesFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IECommerceMallProductImage> {
//         return {
//   id: {string},
//   url: {string},
//   sort_order: {integer},
//   product: await ECommerceMallProductAtSummaryTransformer.transform(input.product),
//   created_at: {string},
//   updated_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------