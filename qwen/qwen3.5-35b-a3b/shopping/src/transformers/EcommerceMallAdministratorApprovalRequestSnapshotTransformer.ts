import { IEcommerceMallAdministratorApprovalRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministratorApprovalRequestSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallAdministratorApprovalRequestSnapshotTransformer {
  export type Payload =
    Prisma.ecommerce_mall_administrator_approval_requests_snapshotsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        approvalRequest: {
          select: { id: true },
        },
        reviewer: {
          select: { id: true },
        },
        requester_id: true,
        requester_type: true,
        request_reason: true,
        status: true,
        approved_grade: true,
        review_reason: true,
        created_at: true,
      },
    } satisfies Prisma.ecommerce_mall_administrator_approval_requests_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallAdministratorApprovalRequestSnapshot> {
    return {
      id: input.id,
      ecommerceMallAdministratorApprovalRequestId: input.approvalRequest.id,
      reviewedByAdministratorId: input.reviewer?.id ?? null,
      requesterId: input.requester_id,
      requesterType: input.requester_type as "member" | "seller",
      requestReason: input.request_reason,
      status: input.status as "pending" | "approved" | "rejected",
      approvedGrade: input.approved_grade
        ? (input.approved_grade as "regular" | "super")
        : null,
      reviewReason: input.review_reason ?? null,
      createdAt: input.created_at.toISOString(),
    } satisfies IEcommerceMallAdministratorApprovalRequestSnapshot;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallAdministratorApprovalRequestSnapshotTransformer {
//       export type Payload = Prisma.ecommerce_mall_administrator_approval_requests_snapshotsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             requester_id: true,
//             requester_type: true,
//             request_reason: true,
//             status: true,
//             approved_grade: true,
//             review_reason: true,
//             created_at: true,
//             ecommerce_mall_administrator_approval_request_id: true,
//             reviewed_by_administrator_id: true,
//           },
//         } satisfies Prisma.ecommerce_mall_administrator_approval_requests_snapshotsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallAdministratorApprovalRequestSnapshot> {
//         return {
//   id: {string},
//   ecommerceMallAdministratorApprovalRequestId: {string},
//   reviewedByAdministratorId: {string | null},
//   requesterId: {string},
//   requesterType: {"member" | "seller"},
//   requestReason: {string},
//   status: {"pending" | "approved" | "rejected"},
//   approvedGrade: {"regular" | "super" | null},
//   reviewReason: {string | null},
//   createdAt: {string},
//         };
//       }
//     }
//--------------------------------------------------------------