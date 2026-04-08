import { IEcommerceMallAdministratorApprovalRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministratorApprovalRequestSnapshot";
import { IEcommerceMallAdministratorApprovalRequests } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministratorApprovalRequests";
import { IEcommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallAdministratorApprovalRequestsAtSummaryTransformer } from "./EcommerceMallAdministratorApprovalRequestsAtSummaryTransformer";
import { EcommerceMallSuperAdministratorAtSummaryTransformer } from "./EcommerceMallSuperAdministratorAtSummaryTransformer";

export namespace EcommerceMallAdministratorApprovalRequestSnapshotAtSummaryTransformer {
  export type Payload =
    Prisma.ecommerce_mall_administrator_approval_requests_snapshotsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        requester_id: true,
        requester_type: true,
        request_reason: true,
        status: true,
        approved_grade: true,
        review_reason: true,
        created_at: true,
        approvalRequest:
          EcommerceMallAdministratorApprovalRequestsAtSummaryTransformer.select(),
        reviewer: EcommerceMallSuperAdministratorAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_mall_administrator_approval_requests_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallAdministratorApprovalRequestSnapshot.ISummary> {
    return {
      id: input.id,
      requester_id: input.requester_id,
      requester_type: input.requester_type as "member" | "seller",
      request_reason: input.request_reason,
      status: input.status as "pending" | "approved" | "rejected",
      approved_grade: input.approved_grade as "regular" | "super" | null,
      review_reason: input.review_reason ?? null,
      created_at: input.created_at.toISOString(),
      approval_request:
        await EcommerceMallAdministratorApprovalRequestsAtSummaryTransformer.transform(
          input.approvalRequest,
        ),
      reviewer: input.reviewer
        ? await EcommerceMallSuperAdministratorAtSummaryTransformer.transform(
            input.reviewer,
          )
        : null,
    } satisfies IEcommerceMallAdministratorApprovalRequestSnapshot.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallAdministratorApprovalRequestSnapshotAtSummaryTransformer {
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
//             approvalRequest: EcommerceMallAdministratorApprovalRequestsAtSummaryTransformer.select(),
//             reviewer: EcommerceMallSuperAdministratorAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.ecommerce_mall_administrator_approval_requests_snapshotsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallAdministratorApprovalRequestSnapshot.ISummary> {
//         return {
//   id: {string},
//   requester_id: {string},
//   requester_type: {"member" | "seller"},
//   request_reason: {string},
//   status: {"pending" | "approved" | "rejected"},
//   approved_grade: {"regular" | "super" | null},
//   review_reason: {string | null},
//   created_at: {string},
//   approval_request: await EcommerceMallAdministratorApprovalRequestsAtSummaryTransformer.transform(input.approvalRequest),
//   reviewer: input.reviewer ? await EcommerceMallSuperAdministratorAtSummaryTransformer.transform(input.reviewer) : null,
//         };
//       }
//     }
//--------------------------------------------------------------