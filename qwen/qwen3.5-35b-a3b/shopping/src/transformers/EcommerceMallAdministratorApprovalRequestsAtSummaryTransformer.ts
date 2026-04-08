import { IEcommerceMallAdministratorApprovalRequests } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministratorApprovalRequests";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallAdministratorApprovalRequestsAtSummaryTransformer {
  export type Payload =
    Prisma.ecommerce_mall_administrator_approval_requestsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        status: true,
        reason: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        requestingMember: {
          select: { id: true },
        } satisfies Prisma.ecommerce_mall_membersFindManyArgs,
        requestingSeller: {
          select: { id: true },
        } satisfies Prisma.ecommerce_mall_sellersFindManyArgs,
        reviewingSuperAdmin: {
          select: { id: true },
        } satisfies Prisma.ecommerce_mall_super_administratorsFindManyArgs,
        createdAdmin: {
          select: { id: true },
        } satisfies Prisma.ecommerce_mall_administratorsFindManyArgs,
        _count: { select: { snapshots: true } },
      },
    } satisfies Prisma.ecommerce_mall_administrator_approval_requestsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallAdministratorApprovalRequests.ISummary> {
    return {
      id: input.id,
      status: typia.assert<"pending" | "approved" | "rejected">(input.status),
      reason: input.reason,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
      requesting_member_id: input.requestingMember?.id ?? undefined,
      requesting_seller_id: input.requestingSeller?.id ?? undefined,
      reviewing_super_admin_id: input.reviewingSuperAdmin?.id ?? undefined,
      created_admin_id: input.createdAdmin?.id ?? undefined,
    } satisfies IEcommerceMallAdministratorApprovalRequests.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallAdministratorApprovalRequestsAtSummaryTransformer {
//       export type Payload = Prisma.ecommerce_mall_administrator_approval_requestsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             status: true,
//             reason: true,
//             requesting_member_id: true,
//             requesting_seller_id: true,
//             reviewing_super_admin_id: true,
//             created_admin_id: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//           },
//         } satisfies Prisma.ecommerce_mall_administrator_approval_requestsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallAdministratorApprovalRequests.ISummary> {
//         return {
//   id: {string},
//   status: {"pending" | "approved" | "rejected"},
//   reason: {string},
//   requesting_member_id: {string},
//   requesting_seller_id: {string},
//   reviewing_super_admin_id: {string},
//   created_admin_id: {string},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------