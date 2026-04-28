import { IEcommercePlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomer";
import { IEcommercePlatformCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomerPasswordReset";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommercePlatformCustomerAtSummaryTransformer } from "./EcommercePlatformCustomerAtSummaryTransformer";

export namespace EcommercePlatformCustomerPasswordResetAtSummaryTransformer {
  export type Payload =
    Prisma.ecommerce_platform_customer_password_resetsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        token: true,
        ip: true,
        href: true,
        referrer: true,
        created_at: true,
        expired_at: true,
        used_at: true,
        deleted_at: true,
        ecommercePlatformCustomer:
          EcommercePlatformCustomerAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_platform_customer_password_resetsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommercePlatformCustomerPasswordReset.ISummary> {
    return {
      id: input.id,
      status: input.used_at ? "consumed" : "unused",
      created_at: input.created_at.toISOString(),
      expired_at: input.expired_at.toISOString(),
      customer: await EcommercePlatformCustomerAtSummaryTransformer.transform(
        input.ecommercePlatformCustomer,
      ),
    };
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommercePlatformCustomerPasswordResetAtSummaryTransformer {
//       export type Payload = Prisma.ecommerce_platform_customer_password_resetsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             token: true,
//             ip: true,
//             href: true,
//             referrer: true,
//             created_at: true,
//             expired_at: true,
//             used_at: true,
//             deleted_at: true,
//             ecommercePlatformCustomer: EcommercePlatformCustomerAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.ecommerce_platform_customer_password_resetsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommercePlatformCustomerPasswordReset.ISummary> {
//         return {
//   id: {string},
//   customer: await EcommercePlatformCustomerAtSummaryTransformer.transform(input.ecommercePlatformCustomer),
//   status: {string},
//   created_at: {string},
//   expired_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------