import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace MallPlatformSellerTransformer {
  export type Payload = Prisma.mall_platform_sellersGetPayload<
    ReturnType<typeof select>
  >;
  export async function transform(
    input: Payload,
  ): Promise<IMallPlatformSeller> {
    return {
      id: input.id,
      email: input.email,
      status: {
        status: input.status as IMallPlatformSellerAccount["status"],
        rejectionReason: input.rejection_reason ?? null,
      },
      rejectionReason: input.rejection_reason ?? null,
      sellerProfile: null as unknown as IMallPlatformSellerProfile,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
    } satisfies IMallPlatformSeller;
  }
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        password_hash: true,
        status: true,
        rejection_reason: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        sessions: true,
        orderItems: true,
        shipments: true,
        refundRequests: true,
        approvalRequests: true,
      },
    } satisfies Prisma.mall_platform_sellersFindManyArgs;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace MallPlatformSellerTransformer {
//       export type Payload = Prisma.mall_platform_sellersGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             email: true,
//             password_hash: true,
//             status: true,
//             rejection_reason: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             ...
//           },
//         } satisfies Prisma.mall_platform_sellersFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IMallPlatformSeller> {
//         return {
//   id: {string},
//   email: {string},
//   status: {IMallPlatformSellerAccount},
//   rejectionReason: {string | null},
//   sellerProfile: {IMallPlatformSellerProfile},
//   createdAt: {string},
//   updatedAt: {string},
//   deletedAt: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------