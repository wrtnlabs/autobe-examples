import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerPasswordReset";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace MallPlatformCustomerPasswordResetTransformer {
  export type Payload = Prisma.mall_platform_customer_password_resetsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        token: true,
        expired_at: true,
        used_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        customer: {
          select: {
            email: true,
          },
        },
      },
    } satisfies Prisma.mall_platform_customer_password_resetsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IMallPlatformCustomerPasswordReset> {
    return {
      id: input.id,
      email: input.customer.email,
      updatedAt: input.updated_at.toISOString(),
    } satisfies IMallPlatformCustomerPasswordReset;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace MallPlatformCustomerPasswordResetTransformer {
//       export type Payload = Prisma.mall_platform_customer_password_resetsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             token: true,
//             expired_at: true,
//             used_at: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             mall_platform_customer_id: true,
//           },
//         } satisfies Prisma.mall_platform_customer_password_resetsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IMallPlatformCustomerPasswordReset> {
//         return {
//   id: {string},
//   email: {string},
//   updatedAt: {string},
//         };
//       }
//     }
//--------------------------------------------------------------