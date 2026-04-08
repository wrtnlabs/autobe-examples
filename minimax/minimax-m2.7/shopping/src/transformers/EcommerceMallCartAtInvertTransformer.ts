import { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
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
import { EcommerceMallCartItemAtInvertTransformer } from "./EcommerceMallCartItemAtInvertTransformer";
import { EcommerceMallCustomerAtSummaryTransformer } from "./EcommerceMallCustomerAtSummaryTransformer";

export namespace EcommerceMallCartAtInvertTransformer {
  export type Payload = Prisma.ecommerce_mall_cartsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        updated_at: true,
        customer: EcommerceMallCustomerAtSummaryTransformer.select(),
        cartItems: EcommerceMallCartItemAtInvertTransformer.select(),
      },
    } satisfies Prisma.ecommerce_mall_cartsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallCart.IInvert> {
    const items = await ArrayUtil.asyncMap(
      input.cartItems,
      EcommerceMallCartItemAtInvertTransformer.transform,
    );
    return {
      id: input.id,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      customer: await EcommerceMallCustomerAtSummaryTransformer.transform(
        input.customer,
      ),
      items: items,
      cartTotal: items.reduce((sum, item) => sum + item.subtotal, 0),
    } satisfies IEcommerceMallCart.IInvert;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallCartAtInvertTransformer {
//       export type Payload = Prisma.ecommerce_mall_cartsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             created_at: true,
//             updated_at: true,
//             customer: EcommerceMallCustomerAtSummaryTransformer.select(),
//             cartItems: EcommerceMallCartItemAtInvertTransformer.select(),
//           },
//         } satisfies Prisma.ecommerce_mall_cartsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallCart.IInvert> {
//         return {
//   cartTotal: {number},
//   createdAt: {string},
//   customer: await EcommerceMallCustomerAtSummaryTransformer.transform(input.customer),
//   id: {string},
//   items: await ArrayUtil.asyncMap(input.cartItems, EcommerceMallCartItemAtInvertTransformer.transform),
//   updatedAt: {string},
//         };
//       }
//     }
//--------------------------------------------------------------