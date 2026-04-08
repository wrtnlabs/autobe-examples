import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { MallPlatformProductAtSummaryTransformer } from "./MallPlatformProductAtSummaryTransformer";

export namespace MallPlatformProductImageAtSummaryTransformer {
  export type Payload = Prisma.mall_platform_product_imagesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        image_url: true,
        sort_order: true,
        is_main: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        product: MallPlatformProductAtSummaryTransformer.select(),
      },
    } satisfies Prisma.mall_platform_product_imagesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IMallPlatformProductImage.ISummary> {
    return {
      id: input.id,
      product: await MallPlatformProductAtSummaryTransformer.transform(
        input.product,
      ),
      imageUrl: input.image_url,
      sortOrder: input.sort_order,
      isMain: input.is_main,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
    } satisfies IMallPlatformProductImage.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace MallPlatformProductImageAtSummaryTransformer {
//       export type Payload = Prisma.mall_platform_product_imagesGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             image_url: true,
//             sort_order: true,
//             is_main: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             product: MallPlatformProductAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.mall_platform_product_imagesFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IMallPlatformProductImage.ISummary> {
//         return {
//   id: {string},
//   product: await MallPlatformProductAtSummaryTransformer.transform(input.product),
//   imageUrl: {string},
//   sortOrder: {integer},
//   isMain: {boolean},
//   createdAt: {string},
//   updatedAt: {string},
//   deletedAt: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------