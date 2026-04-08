import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallCustomerEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerEmailVerification";
import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallCustomerAtSummaryTransformer } from "./EcommerceMallCustomerAtSummaryTransformer";

export namespace EcommerceMallCustomerEmailVerificationTransformer {
  export type Payload =
    Prisma.ecommerce_mall_customer_email_verificationsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        token: true,
        expires_at: true,
        verified_at: true,
        customer: EcommerceMallCustomerAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_mall_customer_email_verificationsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallCustomerEmailVerification> {
    return {
      id: input.id,
      token: input.token,
      expires_at: input.expires_at.toISOString(),
      verified_at: input.verified_at?.toISOString() ?? null,
      customer: await EcommerceMallCustomerAtSummaryTransformer.transform(
        input.customer,
      ),
    };
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallCustomerEmailVerificationTransformer {
//       export type Payload = Prisma.ecommerce_mall_customer_email_verificationsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             token: true,
//             expires_at: true,
//             verified_at: true,
//             customer: EcommerceMallCustomerAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.ecommerce_mall_customer_email_verificationsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallCustomerEmailVerification> {
//         return {
//   id: {string},
//   token: {string},
//   expires_at: {string},
//   verified_at: {string | null},
//   customer: await EcommerceMallCustomerAtSummaryTransformer.transform(input.customer),
//         };
//       }
//     }
//--------------------------------------------------------------