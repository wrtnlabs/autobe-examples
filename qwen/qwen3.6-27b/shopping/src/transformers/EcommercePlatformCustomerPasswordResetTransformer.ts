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

export namespace EcommercePlatformCustomerPasswordResetTransformer {
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
  ): Promise<IEcommercePlatformCustomerPasswordReset> {
    return {
      id: input.id,
      customer: await EcommercePlatformCustomerAtSummaryTransformer.transform(
        input.ecommercePlatformCustomer,
      ),
      token: input.token,
      ip: input.ip,
      href: input.href,
      referrer: input.referrer,
      created_at: input.created_at.toISOString(),
      expired_at: input.expired_at.toISOString(),
      used_at: input.used_at?.toISOString() ?? null,
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommercePlatformCustomerPasswordResetTransformer {
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
//       export async function transform(input: Payload): Promise<IEcommercePlatformCustomerPasswordReset> {
//         return {
//   id: {string},
//   customer: await EcommercePlatformCustomerAtSummaryTransformer.transform(input.ecommercePlatformCustomer),
//   token: {string},
//   ip: {string},
//   href: {string},
//   referrer: {string},
//   created_at: {string},
//   expired_at: {string},
//   used_at: {string | null},
//   deleted_at: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------