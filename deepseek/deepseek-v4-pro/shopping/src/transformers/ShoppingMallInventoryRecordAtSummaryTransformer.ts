import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallInventoryRecordAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_inventory_recordsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        quantity_change: true,
        reason: true,
        created_at: true,
        variant: {
          select: {
            id: true,
          },
        } satisfies Prisma.shopping_mall_product_variantsFindManyArgs,
      },
    } satisfies Prisma.shopping_mall_inventory_recordsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallInventoryRecord.ISummary> {
    return {
      id: input.id,
      quantity_change: input.quantity_change,
      reason: input.reason,
      created_at: input.created_at.toISOString(),
      shopping_mall_product_variant_id: input.variant.id,
    } satisfies IShoppingMallInventoryRecord.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ShoppingMallInventoryRecordAtSummaryTransformer {
//       export type Payload = Prisma.shopping_mall_inventory_recordsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             quantity_change: true,
//             reason: true,
//             created_at: true,
//             shopping_mall_product_variant_id: true,
//           },
//         } satisfies Prisma.shopping_mall_inventory_recordsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IShoppingMallInventoryRecord.ISummary> {
//         return {
//   id: {string},
//   quantity_change: {integer},
//   reason: {string},
//   created_at: {string},
//   shopping_mall_product_variant_id: {string},
//         };
//       }
//     }
//--------------------------------------------------------------