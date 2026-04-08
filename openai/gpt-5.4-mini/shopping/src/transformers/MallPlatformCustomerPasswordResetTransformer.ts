import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerPasswordReset";
import { ArrayUtil } from "@nestia/e2e";
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
        mall_platform_customer_id: true,
        token: true,
        expired_at: true,
        used_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.mall_platform_customer_password_resetsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IMallPlatformCustomerPasswordReset> {
    return {
      id: input.id,
      mallPlatformCustomerId: input.mall_platform_customer_id,
      token: input.token,
      expiredAt: input.expired_at.toISOString(),
      usedAt: input.used_at?.toISOString() ?? null,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
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
//   mallPlatformCustomerId: {string},
//   token: {string},
//   expiredAt: {string},
//   usedAt: {string | null},
//   createdAt: {string},
//   updatedAt: {string},
//   deletedAt: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------