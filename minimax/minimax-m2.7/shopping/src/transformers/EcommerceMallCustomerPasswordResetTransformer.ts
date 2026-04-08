import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerPasswordReset";
import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallCustomerAtSummaryTransformer } from "./EcommerceMallCustomerAtSummaryTransformer";

export namespace EcommerceMallCustomerPasswordResetTransformer {
  // Payload type first
  export type Payload =
    Prisma.ecommerce_mall_customer_password_resetsGetPayload<
      ReturnType<typeof select>
    >;
  // select() function second
  export function select() {
    return {
      select: {
        id: true,
        token: true,
        expires_at: true,
        used_at: true,
        customer: EcommerceMallCustomerAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_mall_customer_password_resetsFindManyArgs;
  }
  // transform() function last
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallCustomerPasswordReset> {
    return {
      id: input.id,
      customer: await EcommerceMallCustomerAtSummaryTransformer.transform(
        input.customer,
      ),
      expiresAt: input.expires_at.toISOString(),
      usedAt: input.used_at?.toISOString() ?? null,
    } satisfies IEcommerceMallCustomerPasswordReset;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallCustomerPasswordResetTransformer {
//       export type Payload = Prisma.ecommerce_mall_customer_password_resetsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             token: true,
//             expires_at: true,
//             used_at: true,
//             customer: EcommerceMallCustomerAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.ecommerce_mall_customer_password_resetsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallCustomerPasswordReset> {
//         return {
//   id: {string},
//   customer: await EcommerceMallCustomerAtSummaryTransformer.transform(input.customer),
//   expiresAt: {string},
//   usedAt: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------