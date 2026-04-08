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

export namespace EcommerceMallCartItemAtSummaryTransformer {
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
        productVariant:
          EcommerceMallProductVariantAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_mall_cart_itemsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallCartItem.ISummary> {
    const variant = input.productVariant;
    const product = variant.product;
    // Compute availability status based on variant state
    const availabilityStatus =
      variant.deleted_at !== null
        ? "unavailable"
        : variant.quantity > 0
          ? "available"
          : "out_of_stock";
    // Compute stock warning
    const stockWarning = input.quantity > variant.quantity;
    // Compute line subtotal using variant price or product base price
    const lineSubtotal = (variant.price ?? product.base_price) * input.quantity;
    return {
      id: input.id,
      quantity: input.quantity,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      availabilityStatus,
      stockWarning,
      stockShortageAmount: stockWarning
        ? variant.quantity - input.quantity
        : undefined,
      lineSubtotal,
      productName: product.name,
      variantSkuCode: variant.sku_code,
      variant:
        await EcommerceMallProductVariantAtSummaryTransformer.transform(
          variant,
        ),
    } satisfies IEcommerceMallCartItem.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallCartItemAtSummaryTransformer {
//       export type Payload = Prisma.ecommerce_mall_cart_itemsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             quantity: true,
//             created_at: true,
//             updated_at: true,
//             ecommerce_mall_cart_id: true,
//             productVariant: EcommerceMallProductVariantAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.ecommerce_mall_cart_itemsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallCartItem.ISummary> {
//         return {
//   id: {string},
//   quantity: {integer},
//   createdAt: {string},
//   updatedAt: {string},
//   availabilityStatus: {"available" | "out_of_stock" | "unavailable"},
//   stockWarning: {boolean},
//   stockShortageAmount: {integer},
//   lineSubtotal: {number},
//   productName: {string},
//   variantSkuCode: {string},
//   variant: await EcommerceMallProductVariantAtSummaryTransformer.transform(input.productVariant),
//         };
//       }
//     }
//--------------------------------------------------------------