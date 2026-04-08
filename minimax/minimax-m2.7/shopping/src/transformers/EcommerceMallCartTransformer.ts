import { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
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
import { EcommerceMallCartItemTransformer } from "./EcommerceMallCartItemTransformer";
import { EcommerceMallCustomerAtSummaryTransformer } from "./EcommerceMallCustomerAtSummaryTransformer";

export namespace EcommerceMallCartTransformer {
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
        cartItems: EcommerceMallCartItemTransformer.select(),
      },
    } satisfies Prisma.ecommerce_mall_cartsFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IEcommerceMallCart> {
    const items = await ArrayUtil.asyncMap(
      input.cartItems,
      EcommerceMallCartItemTransformer.transform,
    );
    const total = items.reduce((sum, item) => sum + item.subtotal, 0);
    return {
      id: input.id,
      customer: await EcommerceMallCustomerAtSummaryTransformer.transform(
        input.customer,
      ),
      items,
      total,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
    } satisfies IEcommerceMallCart;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallCartTransformer {
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
//             cartItems: EcommerceMallCartItemTransformer.select(),
//           },
//         } satisfies Prisma.ecommerce_mall_cartsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallCart> {
//         return {
//   id: {string},
//   customer: await EcommerceMallCustomerAtSummaryTransformer.transform(input.customer),
//   items: await ArrayUtil.asyncMap(input.cartItems, EcommerceMallCartItemTransformer.transform),
//   total: {number},
//   createdAt: {string},
//   updatedAt: {string},
//         };
//       }
//     }
//--------------------------------------------------------------