import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallOrderAtSummaryTransformer } from "./EcommerceMallOrderAtSummaryTransformer";
import { EcommerceMallProductAtSummaryTransformer } from "./EcommerceMallProductAtSummaryTransformer";
import { EcommerceMallProductVariantAtSummaryTransformer } from "./EcommerceMallProductVariantAtSummaryTransformer";
import { EcommerceMallSellerAtSummaryTransformer } from "./EcommerceMallSellerAtSummaryTransformer";

export namespace EcommerceMallOrderItemTransformer {
  export type Payload = Prisma.ecommerce_mall_order_itemsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        quantity: true,
        price_at_purchase: true,
        status: true,
        created_at: true,
        updated_at: true,
        order: EcommerceMallOrderAtSummaryTransformer.select(),
        product: EcommerceMallProductAtSummaryTransformer.select(),
        variant: EcommerceMallProductVariantAtSummaryTransformer.select(),
        seller: EcommerceMallSellerAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_mall_order_itemsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallOrderItem> {
    return {
      id: input.id,
      quantity: input.quantity,
      priceAtPurchase: input.price_at_purchase,
      status: input.status,
      order: await EcommerceMallOrderAtSummaryTransformer.transform(
        input.order,
      ),
      product: await EcommerceMallProductAtSummaryTransformer.transform(
        input.product,
      ),
      variant: await EcommerceMallProductVariantAtSummaryTransformer.transform(
        input.variant,
      ),
      seller: await EcommerceMallSellerAtSummaryTransformer.transform(
        input.seller,
      ),
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
    } satisfies IEcommerceMallOrderItem;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallOrderItemTransformer {
//       export type Payload = Prisma.ecommerce_mall_order_itemsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             quantity: true,
//             price_at_purchase: true,
//             status: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             order: EcommerceMallOrderAtSummaryTransformer.select(),
//             product: EcommerceMallProductAtSummaryTransformer.select(),
//             variant: EcommerceMallProductVariantAtSummaryTransformer.select(),
//             seller: EcommerceMallSellerAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.ecommerce_mall_order_itemsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallOrderItem> {
//         return {
//   id: {string},
//   quantity: {integer},
//   priceAtPurchase: {number},
//   status: {string},
//   order: await EcommerceMallOrderAtSummaryTransformer.transform(input.order),
//   product: await EcommerceMallProductAtSummaryTransformer.transform(input.product),
//   variant: await EcommerceMallProductVariantAtSummaryTransformer.transform(input.variant),
//   seller: await EcommerceMallSellerAtSummaryTransformer.transform(input.seller),
//   createdAt: {string},
//   updatedAt: {string},
//         };
//       }
//     }
//--------------------------------------------------------------