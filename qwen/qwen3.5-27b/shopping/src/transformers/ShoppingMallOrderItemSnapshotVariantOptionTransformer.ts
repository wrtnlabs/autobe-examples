import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotVariantOption";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallOrderItemSnapshotVariantOptionTransformer {
  export type Payload =
    Prisma.shopping_mall_order_item_snapshot_variant_optionsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        key: true,
        value: true,
        created_at: true,
      },
    } satisfies Prisma.shopping_mall_order_item_snapshot_variant_optionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallOrderItemSnapshotVariantOption> {
    return {
      id: input.id,
      key: input.key,
      value: input.value,
      created_at: input.created_at.toISOString(),
    };
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ShoppingMallOrderItemSnapshotVariantOptionTransformer {
//       export type Payload = Prisma.shopping_mall_order_item_snapshot_variant_optionsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             key: true,
//             value: true,
//             created_at: true,
//             shopping_mall_order_item_snapshot_id: true,
//           },
//         } satisfies Prisma.shopping_mall_order_item_snapshot_variant_optionsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IShoppingMallOrderItemSnapshotVariantOption> {
//         return {
//   id: {string},
//   key: {string},
//   value: {string},
//   created_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------