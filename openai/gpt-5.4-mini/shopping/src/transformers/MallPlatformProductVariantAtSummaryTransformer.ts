import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { MallPlatformProductAtSummaryTransformer } from "./MallPlatformProductAtSummaryTransformer";

export namespace MallPlatformProductVariantAtSummaryTransformer {
  export type Payload = Prisma.mall_platform_product_variantsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        sku_code: true,
        option_values: true,
        price_override: true,
        is_active: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        product: MallPlatformProductAtSummaryTransformer.select(),
        snapshots: { select: { id: true } },
        inventoryRecords: { select: { id: true } },
        cartItems: { select: { id: true } },
        orderItems: { select: { id: true } },
      },
    } satisfies Prisma.mall_platform_product_variantsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IMallPlatformProductVariant.ISummary> {
    return {
      id: input.id,
      product: await MallPlatformProductAtSummaryTransformer.transform(
        input.product,
      ),
      skuCode: input.sku_code,
      optionValues: input.option_values,
      priceOverride:
        input.price_override === null ? null : Number(input.price_override),
      isActive: input.is_active,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
    } satisfies IMallPlatformProductVariant.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace MallPlatformProductVariantAtSummaryTransformer {
//       export type Payload = Prisma.mall_platform_product_variantsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             sku_code: true,
//             option_values: true,
//             price_override: true,
//             is_active: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             product: MallPlatformProductAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.mall_platform_product_variantsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IMallPlatformProductVariant.ISummary> {
//         return {
//   id: {string},
//   product: await MallPlatformProductAtSummaryTransformer.transform(input.product),
//   skuCode: {string},
//   optionValues: {string},
//   priceOverride: {number | null},
//   isActive: {boolean},
//   createdAt: {string},
//   updatedAt: {string},
//   deletedAt: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------