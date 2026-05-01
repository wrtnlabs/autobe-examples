import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSellerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPasswordReset";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallSellerPasswordResetAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_seller_password_resetsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        expired_at: true,
        created_at: true,
      },
    } satisfies Prisma.shopping_mall_seller_password_resetsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallSellerPasswordReset.ISummary> {
    return {
      id: input.id,
      expired: input.expired_at <= new Date(),
      created_at: input.created_at.toISOString(),
      expired_at: input.expired_at.toISOString(),
    } satisfies IShoppingMallSellerPasswordReset.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ShoppingMallSellerPasswordResetAtSummaryTransformer {
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
//             shopping_mall_seller_id: true,
//           },
//         } satisfies Prisma.shopping_mall_seller_password_resetsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IShoppingMallSellerPasswordReset.ISummary> {
//         return {
//   id: {string},
//   expired: {boolean},
//   created_at: {string},
//   expired_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------