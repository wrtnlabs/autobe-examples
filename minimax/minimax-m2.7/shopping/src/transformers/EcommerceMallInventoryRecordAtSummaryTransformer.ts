import { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

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
      },
    } satisfies Prisma.ecommerce_mall_inventory_recordsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallInventoryRecord.ISummary> {
    return {
      id: input.id,
      quantityChange: input.quantity_change,
      reason: input.reason,
      createdAt: toISOStringSafe(input.created_at),
    };
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
//             quantityChange: true,
//             reason: true,
//             createdAt: true,
//           },
//         } satisfies Prisma.ecommerce_mall_inventory_recordsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallInventoryRecord.ISummary> {
//         return {
//   id: {string},
//   quantityChange: {integer},
//   reason: {string},
//   createdAt: {string},
//         };
//       }
//     }
//--------------------------------------------------------------