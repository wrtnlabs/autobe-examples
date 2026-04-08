import { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallProductVariantAtSummaryTransformer } from "./EcommerceMallProductVariantAtSummaryTransformer";

export namespace EcommerceMallInventoryRecordAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_mall_inventory_recordsGetPayload<
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
          EcommerceMallProductVariantAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_mall_inventory_recordsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallInventoryRecord.ISummary> {
    return {
      id: input.id,
      quantity_change: input.quantity_change,
      reason: input.reason,
      created_at: input.created_at.toISOString(),
      variant: await EcommerceMallProductVariantAtSummaryTransformer.transform(
        input.productVariant,
      ),
    } satisfies IEcommerceMallInventoryRecord.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallInventoryRecordAtSummaryTransformer {
//       export type Payload = Prisma.ecommerce_mall_inventory_recordsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             quantity_change: true,
//             reason: true,
//             created_at: true,
//             productVariant: EcommerceMallProductVariantAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.ecommerce_mall_inventory_recordsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallInventoryRecord.ISummary> {
//         return {
//   id: {string},
//   quantity_change: {integer},
//   reason: {string},
//   created_at: {string},
//   variant: await EcommerceMallProductVariantAtSummaryTransformer.transform(input.productVariant),
//         };
//       }
//     }
//--------------------------------------------------------------