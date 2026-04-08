import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { IMallPlatformInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformInventoryRecord";
import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { MallPlatformProductVariantAtSummaryTransformer } from "./MallPlatformProductVariantAtSummaryTransformer";

export namespace MallPlatformInventoryRecordAtSummaryTransformer {
  export type Payload = Prisma.mall_platform_inventory_recordsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
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
  ): Promise<IMallPlatformInventoryRecord.ISummary> {
    return {
      id: input.id,
      productVariant:
        await MallPlatformProductVariantAtSummaryTransformer.transform(
          input.productVariant,
        ),
      quantityChange: input.quantity_change,
      reason: input.reason,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
    } satisfies IMallPlatformInventoryRecord.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace MallPlatformInventoryRecordAtSummaryTransformer {
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
//       export async function transform(input: Payload): Promise<IMallPlatformInventoryRecord.ISummary> {
//         return {
//   id: {string},
//   productVariant: await MallPlatformProductVariantAtSummaryTransformer.transform(input.productVariant),
//   quantityChange: {integer},
//   reason: {string},
//   createdAt: {string},
//   updatedAt: {string},
//   deletedAt: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------