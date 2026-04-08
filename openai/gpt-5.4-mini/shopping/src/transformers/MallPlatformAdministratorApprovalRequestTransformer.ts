import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import { IMallPlatformAdministratorApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministratorApprovalRequest";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace MallPlatformAdministratorApprovalRequestTransformer {
  export type Payload =
    Prisma.mall_platform_administrator_approval_requestsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        reason: true,
        status: true,
        rejection_reason: true,
        reviewed_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        administrator: {
          select: {
            id: true,
          },
        },
        reviewerAdministrator: {
          select: {
            id: true,
          },
        },
        snapshots: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.mall_platform_administrator_approval_requestsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IMallPlatformAdministratorApprovalRequest> {
    return {
      id: input.id,
      administrator: input.administrator as IMallPlatformAdministrator.ISummary,
      reviewerAdministrator:
        input.reviewerAdministrator as IMallPlatformAdministrator.ISummary | null,
      reason: input.reason,
      status: input.status,
      rejectionReason: input.rejection_reason,
      reviewedAt: input.reviewed_at?.toISOString() ?? null,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
    } satisfies IMallPlatformAdministratorApprovalRequest;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace MallPlatformAdministratorApprovalRequestTransformer {
//       export type Payload = Prisma.mall_platform_administrator_approval_requestsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             reason: true,
//             status: true,
//             rejection_reason: true,
//             reviewed_at: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             administrator_id: true,
//             reviewer_administrator_id: true,
//             ...
//           },
//         } satisfies Prisma.mall_platform_administrator_approval_requestsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IMallPlatformAdministratorApprovalRequest> {
//         return {
//   id: {string},
//   administrator: {IMallPlatformAdministrator.ISummary},
//   reviewerAdministrator: {IMallPlatformAdministrator.ISummary | null},
//   reason: {string},
//   status: {string},
//   rejectionReason: {string | null},
//   reviewedAt: {string | null},
//   createdAt: {string},
//   updatedAt: {string},
//   deletedAt: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------