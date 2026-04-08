import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
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

export namespace MallPlatformSellerTransformer {
  export type Payload = Prisma.mall_platform_seller_accountsGetPayload<
    ReturnType<typeof select>
  >;
  export async function transform(
    input: Payload,
  ): Promise<IMallPlatformSeller> {
    return {
      id: input.id,
      email: input.email,
      status: input.approval_status,
      rejectionReason: input.rejection_reason,
      suspendedAt: input.suspended_at?.toISOString() ?? null,
      deletedAt: input.deleted_at?.toISOString() ?? null,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      sellerProfile: input.sellerProfile
        ? await MallPlatformSellerProfileTransformer.transform(
            input.sellerProfile,
          )
        : undefined,
    } satisfies IMallPlatformSeller;
  }
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
        sellerProfile: MallPlatformSellerProfileTransformer.select(),
        products: true,
      },
    } satisfies Prisma.mall_platform_seller_accountsFindManyArgs;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace MallPlatformSellerTransformer {
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
//       export async function transform(input: Payload): Promise<IMallPlatformSeller> {
//         return {
//   id: {string},
//   email: {string},
//   status: {string},
//   rejectionReason: {string | null},
//   suspendedAt: {string | null},
//   deletedAt: {string | null},
//   createdAt: {string},
//   updatedAt: {string},
//   sellerProfile: await MallPlatformSellerProfileTransformer.transform(input.sellerProfile),
//         };
//       }
//     }
//--------------------------------------------------------------