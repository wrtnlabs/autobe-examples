import { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallProductVariantAtSummaryTransformer } from "./EcommerceMallProductVariantAtSummaryTransformer";

export namespace EcommerceMallCartItemTransformer {
  export type Payload = Prisma.ecommerce_mall_cart_itemsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        quantity: true,
        created_at: true,
        updated_at: true,
        cart: true,
        productVariant: {
          select: {
            ...EcommerceMallProductVariantAtSummaryTransformer.select().select,
            deleted_at: true,
          },
        },
      },
    } satisfies Prisma.ecommerce_mall_cart_itemsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallCartItem> {
    const unitPrice =
      input.productVariant.price ?? input.productVariant.product.base_price;
    const lineSubtotal = input.quantity * unitPrice;
    const availabilityStatus: "available" | "unavailable" | "low_stock" =
      input.productVariant.deleted_at !== null
        ? "unavailable"
        : input.quantity > input.productVariant.quantity
          ? "low_stock"
          : "available";
    const stockWarning =
      input.quantity > input.productVariant.quantity
        ? `Only ${input.productVariant.quantity} units available for this product.`
        : undefined;
    return {
      id: input.id,
      productVariant:
        await EcommerceMallProductVariantAtSummaryTransformer.transform(
          input.productVariant,
        ),
      quantity: input.quantity,
      unitPrice,
      lineSubtotal,
      availabilityStatus,
      stockWarning,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
    } satisfies IEcommerceMallCartItem;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallCartItemTransformer {
//       export type Payload = Prisma.ecommerce_mall_cart_itemsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             quantity: true,
//             unitPrice: true,
//             lineSubtotal: true,
//             availabilityStatus: true,
//             stockWarning: true,
//             createdAt: true,
//             updatedAt: true,
//             ...
//           },
//         } satisfies Prisma.ecommerce_mall_cart_itemsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallCartItem> {
//         return {
//   id: {string},
//   productVariant: {IEcommerceMallProductVariant.ISummary},
//   quantity: {integer},
//   unitPrice: {number},
//   lineSubtotal: {number},
//   availabilityStatus: {"available" | "unavailable" | "low_stock"},
//   stockWarning: {string},
//   createdAt: {string},
//   updatedAt: {string},
//         };
//       }
//     }
//--------------------------------------------------------------