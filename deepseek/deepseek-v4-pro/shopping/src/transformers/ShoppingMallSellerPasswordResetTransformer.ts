import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSellerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPasswordReset";
import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallSellerAtSummaryTransformer } from "./ShoppingMallSellerAtSummaryTransformer";

export namespace ShoppingMallSellerPasswordResetTransformer {
  export type Payload = Prisma.shopping_mall_seller_password_resetsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        token: true,
        expired_at: true,
        created_at: true,
        updated_at: true,
        seller: ShoppingMallSellerAtSummaryTransformer.select(),
      },
    } satisfies Prisma.shopping_mall_seller_password_resetsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallSellerPasswordReset> {
    return {
      id: input.id,
      token: input.token,
      expired_at: input.expired_at.toISOString(),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      seller: await ShoppingMallSellerAtSummaryTransformer.transform(
        input.seller,
      ),
    };
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ShoppingMallSellerPasswordResetTransformer {
//       export type Payload = Prisma.shopping_mall_seller_password_resetsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             token: true,
//             expired_at: true,
//             created_at: true,
//             updated_at: true,
//             seller: ShoppingMallSellerAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.shopping_mall_seller_password_resetsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IShoppingMallSellerPasswordReset> {
//         return {
//   id: {string},
//   token: {string},
//   expired_at: {string},
//   created_at: {string},
//   updated_at: {string},
//   seller: await ShoppingMallSellerAtSummaryTransformer.transform(input.seller),
//         };
//       }
//     }
//--------------------------------------------------------------