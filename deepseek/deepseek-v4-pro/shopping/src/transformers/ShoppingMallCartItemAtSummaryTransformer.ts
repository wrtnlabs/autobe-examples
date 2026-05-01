import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
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

export namespace ShoppingMallCartItemAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_cart_itemsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        quantity: true,
        created_at: true,
        updated_at: true,
        customer: {
          select: {
            id: true,
          },
        } satisfies Prisma.shopping_mall_customersFindManyArgs,
        productVariant: {
          select: {
            ...ShoppingMallProductVariantAtSummaryTransformer.select().select,
            deleted_at: true,
            product: {
              select: {
                base_price: true,
              },
            } satisfies Prisma.shopping_mall_productsFindManyArgs,
          },
        } satisfies Prisma.shopping_mall_product_variantsFindManyArgs,
      },
    } satisfies Prisma.shopping_mall_cart_itemsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallCartItem.ISummary> {
    const variantRaw = input.productVariant as unknown as {
      deleted_at: Date | null;
      product: {
        base_price: number;
      } | null;
    };
    const variant =
      await ShoppingMallProductVariantAtSummaryTransformer.transform(
        input.productVariant,
      );
    const effectivePrice = variant.price ?? variantRaw.product?.base_price ?? 0;
    const subtotal = input.quantity * effectivePrice;
    const variantDeleted = variantRaw.deleted_at !== null;
    const stock = variant.stock_quantity;
    let available: boolean;
    let unavailable_reason:
      | "variant_deleted"
      | "out_of_stock"
      | "insufficient_stock"
      | null;
    if (variantDeleted) {
      available = false;
      unavailable_reason = "variant_deleted";
    } else if (stock === 0) {
      available = false;
      unavailable_reason = "out_of_stock";
    } else if (stock < input.quantity) {
      available = false;
      unavailable_reason = "insufficient_stock";
    } else {
      available = true;
      unavailable_reason = null;
    }
    return {
      id: input.id,
      productVariant: variant,
      quantity: input.quantity,
      subtotal,
      available,
      unavailable_reason,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    } satisfies IShoppingMallCartItem.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ShoppingMallCartItemAtSummaryTransformer {
//       export type Payload = Prisma.shopping_mall_cart_itemsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             quantity: true,
//             created_at: true,
//             updated_at: true,
//             shopping_mall_customer_id: true,
//             productVariant: ShoppingMallProductVariantAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.shopping_mall_cart_itemsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IShoppingMallCartItem.ISummary> {
//         return {
//   id: {string},
//   productVariant: await ShoppingMallProductVariantAtSummaryTransformer.transform(input.productVariant),
//   quantity: {integer},
//   subtotal: {number},
//   available: {boolean},
//   unavailable_reason: {"variant_deleted" | "out_of_stock" | "insufficient_stock" | null},
//   created_at: {string},
//   updated_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------