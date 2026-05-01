import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerPasswordReset";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallCustomerPasswordResetAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_customer_password_resetsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        expired_at: true,
        created_at: true,
      },
    } satisfies Prisma.shopping_mall_customer_password_resetsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallCustomerPasswordReset.ISummary> {
    return {
      id: input.id,
      expired_at: input.expired_at.toISOString(),
      created_at: input.created_at.toISOString(),
      is_expired: input.expired_at <= new Date(),
    } satisfies IShoppingMallCustomerPasswordReset.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ShoppingMallCustomerPasswordResetAtSummaryTransformer {
//       export type Payload = Prisma.shopping_mall_customer_password_resetsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             token: true,
//             expired_at: true,
//             created_at: true,
//             shopping_mall_customer_id: true,
//           },
//         } satisfies Prisma.shopping_mall_customer_password_resetsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IShoppingMallCustomerPasswordReset.ISummary> {
//         return {
//   id: {string},
//   expired_at: {string},
//   created_at: {string},
//   is_expired: {boolean},
//         };
//       }
//     }
//--------------------------------------------------------------