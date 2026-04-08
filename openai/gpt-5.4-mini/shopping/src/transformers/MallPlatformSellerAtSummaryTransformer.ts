import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace MallPlatformSellerAtSummaryTransformer {
  export type Payload = Prisma.mall_platform_sellersGetPayload<
    ReturnType<typeof select>
  >;
  export async function transform(
    input: Payload,
  ): Promise<IMallPlatformSeller.ISummary> {
    return {
      id: input.id,
      email: input.email,
      status: input.status,
      rejectionReason: input.rejection_reason,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
    } satisfies IMallPlatformSeller.ISummary;
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
        sessions: { select: {} },
        orderItems: { select: {} },
        shipments: { select: {} },
        refundRequests: { select: {} },
        approvalRequests: { select: {} },
      },
    } satisfies Prisma.mall_platform_sellersFindManyArgs;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace MallPlatformSellerAtSummaryTransformer {
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
//           },
//         } satisfies Prisma.mall_platform_sellersFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IMallPlatformSeller.ISummary> {
//         return {
//   id: {string},
//   email: {string},
//   status: {string},
//   rejectionReason: {string | null},
//   createdAt: {string},
//   updatedAt: {string},
//   deletedAt: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------