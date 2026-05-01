import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallOrderAtSummaryTransformer } from "./ShoppingMallOrderAtSummaryTransformer";
import { ShoppingMallProductVariantAtSummaryTransformer } from "./ShoppingMallProductVariantAtSummaryTransformer";

export namespace ShoppingMallOrderItemAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_order_itemsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        quantity: true,
        price: true,
        status: true,
        created_at: true,
        updated_at: true,
        order: ShoppingMallOrderAtSummaryTransformer.select(),
        productVariant: ShoppingMallProductVariantAtSummaryTransformer.select(),
      },
    } satisfies Prisma.shopping_mall_order_itemsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallOrderItem.ISummary> {
    return {
      id: input.id,
      order: await ShoppingMallOrderAtSummaryTransformer.transform(input.order),
      productVariant:
        await ShoppingMallProductVariantAtSummaryTransformer.transform(
          input.productVariant,
        ),
      quantity: input.quantity,
      price: input.price,
      status: input.status,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    } satisfies IShoppingMallOrderItem.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ShoppingMallOrderItemAtSummaryTransformer {
//       export type Payload = Prisma.shopping_mall_order_itemsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             quantity: true,
//             price: true,
//             status: true,
//             created_at: true,
//             updated_at: true,
//             order: ShoppingMallOrderAtSummaryTransformer.select(),
//             productVariant: ShoppingMallProductVariantAtSummaryTransformer.select(),
//             shopping_mall_shipment_id: true,
//           },
//         } satisfies Prisma.shopping_mall_order_itemsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IShoppingMallOrderItem.ISummary> {
//         return {
//   id: {string},
//   order: await ShoppingMallOrderAtSummaryTransformer.transform(input.order),
//   productVariant: await ShoppingMallProductVariantAtSummaryTransformer.transform(input.productVariant),
//   quantity: {integer},
//   price: {number},
//   status: {string},
//   created_at: {string},
//   updated_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------