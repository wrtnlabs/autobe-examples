import { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
import { IEcommercePlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductImage";
import { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommercePlatformProductAtSummaryTransformer } from "./EcommercePlatformProductAtSummaryTransformer";

export namespace EcommercePlatformProductImageAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_platform_product_imagesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        uri: true,
        order_index: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        product: EcommercePlatformProductAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_platform_product_imagesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommercePlatformProductImage.ISummary> {
    return {
      id: input.id,
      uri: input.uri,
      order_index: input.order_index,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      product: await EcommercePlatformProductAtSummaryTransformer.transform(
        input.product,
      ),
    } satisfies IEcommercePlatformProductImage.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommercePlatformProductImageAtSummaryTransformer {
//       export type Payload = Prisma.ecommerce_platform_product_imagesGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             uri: true,
//             order_index: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             product: EcommercePlatformProductAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.ecommerce_platform_product_imagesFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommercePlatformProductImage.ISummary> {
//         return {
//   created_at: {string},
//   deleted_at: {string | null},
//   id: {string},
//   order_index: {integer},
//   product: await EcommercePlatformProductAtSummaryTransformer.transform(input.product),
//   updated_at: {string},
//   uri: {string},
//         };
//       }
//     }
//--------------------------------------------------------------