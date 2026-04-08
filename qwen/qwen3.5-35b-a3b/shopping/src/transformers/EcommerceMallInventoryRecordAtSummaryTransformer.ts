import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
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
        operation_type: true,
        reference_id: true,
        notes: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
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
      operation_type: input.operation_type,
      created_at: input.created_at.toISOString(),
      reference_id: input.reference_id ?? null,
      notes: input.notes ?? null,
      productVariant:
        await EcommerceMallProductVariantAtSummaryTransformer.transform(
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
//             operation_type: true,
//             reference_id: true,
//             notes: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             productVariant: EcommerceMallProductVariantAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.ecommerce_mall_inventory_recordsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallInventoryRecord.ISummary> {
//         return {
//   id: {string},
//   quantity_change: {integer},
//   operation_type: {string},
//   created_at: {string},
//   reference_id: {string | null},
//   notes: {string | null},
//   productVariant: await EcommerceMallProductVariantAtSummaryTransformer.transform(input.productVariant),
//         };
//       }
//     }
//--------------------------------------------------------------