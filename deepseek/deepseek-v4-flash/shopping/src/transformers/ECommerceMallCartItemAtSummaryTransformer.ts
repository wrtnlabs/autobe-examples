import { IECommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCartItem";
import { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
import { IECommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariant";
import { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ECommerceMallProductVariantAtSummaryTransformer } from "./ECommerceMallProductVariantAtSummaryTransformer";

export namespace ECommerceMallCartItemAtSummaryTransformer {
  export type Payload = Prisma.e_commerce_mall_cart_itemsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        quantity: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        e_commerce_mall_customer_id: true,
        customer: {
          select: {
            id: true,
          },
        } satisfies Prisma.e_commerce_mall_customersFindManyArgs,
        productVariant:
          ECommerceMallProductVariantAtSummaryTransformer.select(),
      },
    } satisfies Prisma.e_commerce_mall_cart_itemsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IECommerceMallCartItem.ISummary> {
    const variant =
      await ECommerceMallProductVariantAtSummaryTransformer.transform(
        input.productVariant,
      );
    const unit_price = variant.effective_price;
    const available_stock = variant.stock;
    const stock_warning = input.quantity > available_stock;
    const availability: "available" | "unavailable" =
      available_stock <= 0 ? "unavailable" : "available";
    return {
      id: input.id,
      quantity: input.quantity,
      unit_price,
      subtotal: input.quantity * unit_price,
      availability,
      stock_warning,
      available_stock,
      variant,
      created_at: input.created_at.toISOString(),
    } satisfies IECommerceMallCartItem.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ECommerceMallCartItemAtSummaryTransformer {
//       export type Payload = Prisma.e_commerce_mall_cart_itemsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             quantity: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             e_commerce_mall_customer_id: true,
//             productVariant: ECommerceMallProductVariantAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.e_commerce_mall_cart_itemsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IECommerceMallCartItem.ISummary> {
//         return {
//   id: {string},
//   quantity: {integer},
//   unit_price: {number},
//   subtotal: {number},
//   availability: {"available" | "unavailable"},
//   stock_warning: {boolean},
//   available_stock: {integer},
//   variant: await ECommerceMallProductVariantAtSummaryTransformer.transform(input.productVariant),
//   created_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------