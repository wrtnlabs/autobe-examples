import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallOrderItemVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemVariantSnapshot";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallOrderItemAtSummaryTransformer } from "./ShoppingMallOrderItemAtSummaryTransformer";

export namespace ShoppingMallOrderItemVariantSnapshotTransformer {
  export type Payload =
    Prisma.shopping_mall_order_item_variant_snapshotsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        sku_code: true,
        option_values: true,
        price: true,
        created_at: true,
        orderItem: ShoppingMallOrderItemAtSummaryTransformer.select(),
      },
    } satisfies Prisma.shopping_mall_order_item_variant_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallOrderItemVariantSnapshot> {
    return {
      id: input.id,
      orderItem: await ShoppingMallOrderItemAtSummaryTransformer.transform(
        input.orderItem,
      ),
      sku_code: input.sku_code,
      option_values: input.option_values,
      price: input.price,
      created_at: input.created_at.toISOString(),
    } satisfies IShoppingMallOrderItemVariantSnapshot;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ShoppingMallOrderItemVariantSnapshotTransformer {
//       export type Payload = Prisma.shopping_mall_order_item_variant_snapshotsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             sku_code: true,
//             option_values: true,
//             price: true,
//             created_at: true,
//             orderItem: ShoppingMallOrderItemAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.shopping_mall_order_item_variant_snapshotsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IShoppingMallOrderItemVariantSnapshot> {
//         return {
//   id: {string},
//   orderItem: await ShoppingMallOrderItemAtSummaryTransformer.transform(input.orderItem),
//   sku_code: {string},
//   option_values: {string},
//   price: {number},
//   created_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------