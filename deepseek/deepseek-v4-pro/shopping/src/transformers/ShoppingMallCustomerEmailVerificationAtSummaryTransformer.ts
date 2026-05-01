import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomerEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerEmailVerification";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallCustomerEmailVerificationAtSummaryTransformer {
  export type Payload =
    Prisma.shopping_mall_customer_email_verificationsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        token: true,
        expired_at: true,
        created_at: true,
        customer: {
          select: {
            id: true,
          },
        } satisfies Prisma.shopping_mall_customersFindManyArgs,
      },
    } satisfies Prisma.shopping_mall_customer_email_verificationsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallCustomerEmailVerification.ISummary> {
    return {
      id: input.id,
      token_prefix: input.token.substring(0, 8),
      is_expired: input.expired_at <= new Date(),
      created_at: input.created_at.toISOString(),
      expired_at: input.expired_at.toISOString(),
    } satisfies IShoppingMallCustomerEmailVerification.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ShoppingMallCustomerEmailVerificationAtSummaryTransformer {
//       export type Payload = Prisma.shopping_mall_customer_email_verificationsGetPayload<ReturnType<typeof select>>;
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
//         } satisfies Prisma.shopping_mall_customer_email_verificationsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IShoppingMallCustomerEmailVerification.ISummary> {
//         return {
//   id: {string},
//   token_prefix: {string},
//   is_expired: {boolean},
//   created_at: {string},
//   expired_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------