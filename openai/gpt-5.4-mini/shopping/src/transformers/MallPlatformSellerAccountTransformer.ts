import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace MallPlatformSellerAccountTransformer {
  export type Payload = Prisma.mall_platform_seller_accountsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        password_hash: true,
        approval_status: true,
        rejection_reason: true,
        suspended_at: true,
        deleted_at: true,
        created_at: true,
        updated_at: true,
        passwordResets: true,
        sellerProfile: true,
        products: true,
      },
    } satisfies Prisma.mall_platform_seller_accountsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IMallPlatformSellerAccount> {
    return {
      status: input.approval_status as IMallPlatformSellerAccount["status"],
      rejectionReason: input.rejection_reason,
    } satisfies IMallPlatformSellerAccount;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace MallPlatformSellerAccountTransformer {
//       export type Payload = Prisma.mall_platform_seller_accountsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             email: true,
//             password_hash: true,
//             approval_status: true,
//             rejection_reason: true,
//             suspended_at: true,
//             deleted_at: true,
//             created_at: true,
//             updated_at: true,
//           },
//         } satisfies Prisma.mall_platform_seller_accountsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IMallPlatformSellerAccount> {
//         return {
//   status: {"pending" | "approved" | "rejected"},
//   rejectionReason: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------