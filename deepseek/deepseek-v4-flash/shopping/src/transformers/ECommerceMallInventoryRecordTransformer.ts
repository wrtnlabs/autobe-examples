import { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import { IECommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallInventoryRecord";
import { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
import { IECommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariant";
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
import { ECommerceMallProductVariantAtSummaryTransformer } from "./ECommerceMallProductVariantAtSummaryTransformer";

export namespace ECommerceMallInventoryRecordTransformer {
  export type Payload = Prisma.e_commerce_mall_inventory_recordsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        quantity_change: true,
        reason: true,
        created_at: true,
        productVariant:
          ECommerceMallProductVariantAtSummaryTransformer.select(),
      },
    } satisfies Prisma.e_commerce_mall_inventory_recordsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IECommerceMallInventoryRecord> {
    return {
      id: input.id,
      variant: await ECommerceMallProductVariantAtSummaryTransformer.transform(
        input.productVariant,
      ),
      quantity_change: input.quantity_change,
      reason: input.reason,
      created_at: input.created_at.toISOString(),
    } satisfies IECommerceMallInventoryRecord;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ECommerceMallInventoryRecordTransformer {
//       export type Payload = Prisma.e_commerce_mall_inventory_recordsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             quantity_change: true,
//             reason: true,
//             created_at: true,
//             productVariant: ECommerceMallProductVariantAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.e_commerce_mall_inventory_recordsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IECommerceMallInventoryRecord> {
//         return {
//   id: {string},
//   variant: await ECommerceMallProductVariantAtSummaryTransformer.transform(input.productVariant),
//   quantity_change: {integer},
//   reason: {string},
//   created_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------