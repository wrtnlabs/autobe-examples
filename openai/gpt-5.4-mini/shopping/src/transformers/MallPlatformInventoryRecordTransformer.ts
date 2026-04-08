import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { IMallPlatformInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformInventoryRecord";
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
import { MallPlatformProductVariantAtSummaryTransformer } from "./MallPlatformProductVariantAtSummaryTransformer";

export namespace MallPlatformInventoryRecordTransformer {
  export type Payload = Prisma.mall_platform_inventory_recordsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        mall_platform_product_variant_id: true,
        quantity_change: true,
        reason: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        productVariant: MallPlatformProductVariantAtSummaryTransformer.select(),
      },
    } satisfies Prisma.mall_platform_inventory_recordsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IMallPlatformInventoryRecord> {
    return {
      id: input.id,
      productVariant:
        await MallPlatformProductVariantAtSummaryTransformer.transform(
          input.productVariant,
        ),
      mall_platform_product_variant_id: input.mall_platform_product_variant_id,
      quantity_change: input.quantity_change,
      reason: input.reason,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    } satisfies IMallPlatformInventoryRecord;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace MallPlatformInventoryRecordTransformer {
//       export type Payload = Prisma.mall_platform_inventory_recordsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             quantity_change: true,
//             reason: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             productVariant: MallPlatformProductVariantAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.mall_platform_inventory_recordsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IMallPlatformInventoryRecord> {
//         return {
//   id: {string},
//   productVariant: await MallPlatformProductVariantAtSummaryTransformer.transform(input.productVariant),
//   mall_platform_product_variant_id: {string},
//   quantity_change: {integer},
//   reason: {string},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------