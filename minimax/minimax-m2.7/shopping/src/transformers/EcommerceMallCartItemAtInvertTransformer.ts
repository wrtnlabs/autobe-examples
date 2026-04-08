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
import { EcommerceMallProductVariantTransformer } from "./EcommerceMallProductVariantTransformer";

export namespace EcommerceMallCartItemAtInvertTransformer {
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
        cart: {
          select: { id: true },
        } satisfies Prisma.ecommerce_mall_cartsFindManyArgs,
        productVariant: EcommerceMallProductVariantTransformer.select(),
      },
    } satisfies Prisma.ecommerce_mall_cart_itemsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallCartItem.IInvert> {
    return {
      id: input.id,
      quantity: input.quantity,
      createdAt: toISOStringSafe(input.created_at),
      updatedAt: toISOStringSafe(input.updated_at),
      productVariant: await EcommerceMallProductVariantTransformer.transform(
        input.productVariant,
      ),
      availabilityStatus:
        input.productVariant.deleted_at === null &&
        input.productVariant.quantity > 0
          ? "available"
          : "unavailable",
      subtotal:
        input.quantity *
        Number(
          input.productVariant.price ?? input.productVariant.product.base_price,
        ),
    } satisfies IEcommerceMallCartItem.IInvert;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallCartItemAtInvertTransformer {
//       export type Payload = Prisma.ecommerce_mall_cart_itemsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             quantity: true,
//             createdAt: true,
//             updatedAt: true,
//             availabilityStatus: true,
//             subtotal: true,
//             ...
//           },
//         } satisfies Prisma.ecommerce_mall_cart_itemsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallCartItem.IInvert> {
//         return {
//   id: {string},
//   quantity: {integer},
//   createdAt: {string},
//   updatedAt: {string},
//   productVariant: {IEcommerceMallProductVariant},
//   availabilityStatus: {string},
//   subtotal: {number},
//         };
//       }
//     }
//--------------------------------------------------------------