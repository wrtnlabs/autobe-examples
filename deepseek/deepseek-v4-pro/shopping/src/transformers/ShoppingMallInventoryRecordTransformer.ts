import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallProductVariantAtSummaryTransformer } from "./ShoppingMallProductVariantAtSummaryTransformer";

export namespace ShoppingMallInventoryRecordTransformer {
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
        variant: ShoppingMallProductVariantAtSummaryTransformer.select(),
      },
    } satisfies Prisma.shopping_mall_inventory_recordsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallInventoryRecord> {
    return {
      id: input.id,
      quantity_change: input.quantity_change,
      reason: input.reason,
      created_at: input.created_at.toISOString(),
      variant: await ShoppingMallProductVariantAtSummaryTransformer.transform(
        input.variant,
      ),
    };
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ShoppingMallInventoryRecordTransformer {
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
//             variant: ShoppingMallProductVariantAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.shopping_mall_inventory_recordsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IShoppingMallInventoryRecord> {
//         return {
//   id: {string},
//   quantity_change: {integer},
//   reason: {string},
//   created_at: {string},
//   variant: await ShoppingMallProductVariantAtSummaryTransformer.transform(input.variant),
//         };
//       }
//     }
//--------------------------------------------------------------