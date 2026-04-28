import { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import { IEcommercePlatformInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformInventoryRecord";
import { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
import { IEcommercePlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariant";
import { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommercePlatformProductVariantAtSummaryTransformer } from "./EcommercePlatformProductVariantAtSummaryTransformer";

export namespace EcommercePlatformInventoryRecordTransformer {
  export type Payload = Prisma.ecommerce_platform_inventory_recordsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        quantity_delta: true,
        reason: true,
        created_at: true,
        productVariant:
          EcommercePlatformProductVariantAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_platform_inventory_recordsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommercePlatformInventoryRecord> {
    return {
      id: input.id,
      variant:
        await EcommercePlatformProductVariantAtSummaryTransformer.transform(
          input.productVariant,
        ),
      quantity_delta: input.quantity_delta,
      reason: input.reason,
      created_at: input.created_at.toISOString(),
    } satisfies IEcommercePlatformInventoryRecord;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommercePlatformInventoryRecordTransformer {
//       export type Payload = Prisma.ecommerce_platform_inventory_recordsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             quantity_delta: true,
//             reason: true,
//             created_at: true,
//             productVariant: EcommercePlatformProductVariantAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.ecommerce_platform_inventory_recordsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommercePlatformInventoryRecord> {
//         return {
//   id: {string},
//   variant: await EcommercePlatformProductVariantAtSummaryTransformer.transform(input.productVariant),
//   quantity_delta: {integer},
//   reason: {string},
//   created_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------