import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallCustomerEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerEmailVerification";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallCustomerAtSummaryTransformer } from "./ShoppingMallCustomerAtSummaryTransformer";

export namespace ShoppingMallCustomerEmailVerificationTransformer {
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
        customer: ShoppingMallCustomerAtSummaryTransformer.select(),
      },
    } satisfies Prisma.shopping_mall_customer_email_verificationsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallCustomerEmailVerification> {
    return {
      id: input.id,
      token: input.token,
      expired_at: input.expired_at.toISOString(),
      created_at: input.created_at.toISOString(),
      customer: await ShoppingMallCustomerAtSummaryTransformer.transform(
        input.customer,
      ),
    } satisfies IShoppingMallCustomerEmailVerification;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ShoppingMallCustomerEmailVerificationTransformer {
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
//             customer: ShoppingMallCustomerAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.shopping_mall_customer_email_verificationsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IShoppingMallCustomerEmailVerification> {
//         return {
//   id: {string},
//   token: {string},
//   expired_at: {string},
//   created_at: {string},
//   customer: await ShoppingMallCustomerAtSummaryTransformer.transform(input.customer),
//         };
//       }
//     }
//--------------------------------------------------------------