import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { MallPlatformSellerProfileTransformer } from "./MallPlatformSellerProfileTransformer";

export namespace MallPlatformSellerAccountTransformer {
  export type Payload = Prisma.mall_platform_seller_accountsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        approval_status: true,
        rejection_reason: true,
        suspended_at: true,
        deleted_at: true,
        created_at: true,
        updated_at: true,
        sellerProfile: MallPlatformSellerProfileTransformer.select(),
      },
    } satisfies Prisma.mall_platform_seller_accountsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IMallPlatformSellerAccount> {
    if (!input.sellerProfile)
      throw new HttpException("Seller profile not found", 404);
    return {
      id: input.id,
      email: input.email,
      approval_status: input.approval_status,
      rejection_reason: input.rejection_reason,
      suspended_at: input.suspended_at?.toISOString() ?? null,
      deleted_at: input.deleted_at?.toISOString() ?? null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      sellerProfile: await MallPlatformSellerProfileTransformer.transform(
        input.sellerProfile,
      ),
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
//             sellerProfile: MallPlatformSellerProfileTransformer.select(),
//           },
//         } satisfies Prisma.mall_platform_seller_accountsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IMallPlatformSellerAccount> {
//         return {
//   id: {string},
//   email: {string},
//   approval_status: {string},
//   rejection_reason: {string | null},
//   suspended_at: {string | null},
//   deleted_at: {string | null},
//   created_at: {string},
//   updated_at: {string},
//   sellerProfile: await MallPlatformSellerProfileTransformer.transform(input.sellerProfile),
//         };
//       }
//     }
//--------------------------------------------------------------