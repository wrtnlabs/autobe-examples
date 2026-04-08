import { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallProductAtSummaryTransformer } from "./EcommerceMallProductAtSummaryTransformer";
import { EcommerceMallProductVariantAtSummaryTransformer } from "./EcommerceMallProductVariantAtSummaryTransformer";

export namespace EcommerceMallCartItemTransformer {
  // Payload type derived from select() for type-safe transform
  export type Payload = Prisma.ecommerce_mall_cart_itemsGetPayload<
    ReturnType<typeof select>
  >;
  // select() function - field selection for Prisma query
  export function select() {
    return {
      select: {
        id: true,
        quantity: true,
        created_at: true,
        updated_at: true,
        cart: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_mall_cartsFindManyArgs,
        productVariant: {
          select: {
            ...EcommerceMallProductVariantAtSummaryTransformer.select().select,
            product: EcommerceMallProductAtSummaryTransformer.select(),
          },
        } satisfies Prisma.ecommerce_mall_product_variantsFindManyArgs,
      },
    } satisfies Prisma.ecommerce_mall_cart_itemsFindManyArgs;
  }
  // transform() function - convert Prisma payload to DTO
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallCartItem> {
    // Compute unit price: variant.price if not null, otherwise product.base_price
    const unitPrice =
      input.productVariant.price ?? input.productVariant.product.base_price;
    const subtotal = input.quantity * unitPrice;
    return {
      id: input.id,
      quantity: input.quantity,
      subtotal: subtotal,
      variant: await EcommerceMallProductVariantAtSummaryTransformer.transform(
        input.productVariant,
      ),
      product: await EcommerceMallProductAtSummaryTransformer.transform(
        input.productVariant.product,
      ),
      createdAt: toISOStringSafe(input.created_at),
      updatedAt: toISOStringSafe(input.updated_at),
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
//             subtotal: true,
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
//   quantity: {integer},
//   subtotal: {number},
//   variant: {IEcommerceMallProductVariant.ISummary},
//   product: {IEcommerceMallProduct.ISummary},
//   createdAt: {string},
//   updatedAt: {string},
//         };
//       }
//     }
//--------------------------------------------------------------