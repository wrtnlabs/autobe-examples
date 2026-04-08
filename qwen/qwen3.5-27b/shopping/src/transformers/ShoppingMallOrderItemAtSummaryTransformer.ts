import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallOrderAtSummaryTransformer } from "./ShoppingMallOrderAtSummaryTransformer";
import { ShoppingMallProductVariantAtSummaryTransformer } from "./ShoppingMallProductVariantAtSummaryTransformer";
import { ShoppingMallSellerAtSummaryTransformer } from "./ShoppingMallSellerAtSummaryTransformer";

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
        order: ShoppingMallOrderAtSummaryTransformer.select(),
        productVariant: ShoppingMallProductVariantAtSummaryTransformer.select(),
        seller: ShoppingMallSellerAtSummaryTransformer.select(),
      },
    } satisfies Prisma.shopping_mall_order_itemsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallOrderItem.ISummary> {
    return {
      id: input.id,
      quantity: input.quantity,
      price: input.price,
      status: input.status,
      created_at: input.created_at.toISOString(),
      order: await ShoppingMallOrderAtSummaryTransformer.transform(input.order),
      productVariant:
        await ShoppingMallProductVariantAtSummaryTransformer.transform(
          input.productVariant,
        ),
      seller: await ShoppingMallSellerAtSummaryTransformer.transform(
        input.seller,
      ),
    };
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
//             deleted_at: true,
//             order: ShoppingMallOrderAtSummaryTransformer.select(),
//             productVariant: ShoppingMallProductVariantAtSummaryTransformer.select(),
//             seller: ShoppingMallSellerAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.shopping_mall_order_itemsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IShoppingMallOrderItem.ISummary> {
//         return {
//   id: {string},
//   quantity: {integer},
//   price: {number},
//   status: {string},
//   created_at: {string},
//   order: await ShoppingMallOrderAtSummaryTransformer.transform(input.order),
//   productVariant: await ShoppingMallProductVariantAtSummaryTransformer.transform(input.productVariant),
//   seller: await ShoppingMallSellerAtSummaryTransformer.transform(input.seller),
//         };
//       }
//     }
//--------------------------------------------------------------