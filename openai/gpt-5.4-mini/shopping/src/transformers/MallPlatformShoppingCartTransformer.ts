import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import { IMallPlatformShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShoppingCart";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { MallPlatformCustomerAtSummaryTransformer } from "./MallPlatformCustomerAtSummaryTransformer";

export namespace MallPlatformShoppingCartTransformer {
  export type Payload = Prisma.mall_platform_shopping_cartsGetPayload<
    ReturnType<typeof select>
  >;
  export async function transform(
    input: Payload,
  ): Promise<IMallPlatformShoppingCart> {
    return {
      id: input.id,
      customer: await MallPlatformCustomerAtSummaryTransformer.transform(
        input.customer,
      ),
      cartItems: null,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
    } satisfies IMallPlatformShoppingCart;
  }
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        customer: MallPlatformCustomerAtSummaryTransformer.select(),
        cartItems: {
          select: {},
        },
      },
    } satisfies Prisma.mall_platform_shopping_cartsFindManyArgs;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace MallPlatformShoppingCartTransformer {
//       export type Payload = Prisma.mall_platform_shopping_cartsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             customer: MallPlatformCustomerAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.mall_platform_shopping_cartsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IMallPlatformShoppingCart> {
//         return {
//   id: {string},
//   customer: await MallPlatformCustomerAtSummaryTransformer.transform(input.customer),
//   cartItems: {null},
//   createdAt: {string},
//   updatedAt: {string},
//   deletedAt: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------