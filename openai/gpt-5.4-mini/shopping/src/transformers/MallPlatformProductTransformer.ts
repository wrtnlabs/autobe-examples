import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { MallPlatformCategoryAtSummaryTransformer } from "./MallPlatformCategoryAtSummaryTransformer";
import { MallPlatformSellerAccountAtSummaryTransformer } from "./MallPlatformSellerAccountAtSummaryTransformer";

export namespace MallPlatformProductTransformer {
  export type Payload = Prisma.mall_platform_productsGetPayload<
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
        sellerAccount: MallPlatformSellerAccountAtSummaryTransformer.select(),
        category: MallPlatformCategoryAtSummaryTransformer.select(),
        images: { select: {} },
        variants: { select: {} },
        productImageSnapshots: { select: {} },
        variantSnapshots: { select: {} },
        wishlistItems: { select: {} },
        reviews: { select: {} },
        snapshots: { select: {} },
      },
    } satisfies Prisma.mall_platform_productsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IMallPlatformProduct> {
    return {
      id: input.id,
      sellerAccount:
        await MallPlatformSellerAccountAtSummaryTransformer.transform(
          input.sellerAccount,
        ),
      category: input.category
        ? await MallPlatformCategoryAtSummaryTransformer.transform(
            input.category,
          )
        : null,
      name: input.name,
      description: input.description,
      basePrice: Number(input.base_price),
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
    };
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace MallPlatformProductTransformer {
//       export type Payload = Prisma.mall_platform_productsGetPayload<ReturnType<typeof select>>;
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
//             sellerAccount: MallPlatformSellerAccountAtSummaryTransformer.select(),
//             category: MallPlatformCategoryAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.mall_platform_productsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IMallPlatformProduct> {
//         return {
//   id: {string},
//   sellerAccount: await MallPlatformSellerAccountAtSummaryTransformer.transform(input.sellerAccount),
//   category: input.category ? await MallPlatformCategoryAtSummaryTransformer.transform(input.category) : null,
//   name: {string},
//   description: {string},
//   basePrice: {number},
//   createdAt: {string},
//   updatedAt: {string},
//   deletedAt: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------