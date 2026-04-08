import { IEcommerceMallAdminRequestOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequestOfCustomer";
import { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallSuperAdminAtSummaryTransformer } from "./EcommerceMallSuperAdminAtSummaryTransformer";

export namespace EcommerceMallAdminRequestOfCustomerTransformer {
  export type Payload = Prisma.ecommerce_mall_admin_requestsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        actor_type: true,
        requested_grade: true,
        reason: true,
        status: true,
        reviewed_reason: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        reviewer: EcommerceMallSuperAdminAtSummaryTransformer.select(),
        customer: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_mall_admin_request_of_customersFindManyArgs,
        adminRequestOfSeller: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_mall_admin_request_of_sellersFindManyArgs,
      },
    } satisfies Prisma.ecommerce_mall_admin_requestsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallAdminRequestOfCustomer> {
    return {
      id: input.id,
      actorType: input.actor_type,
      requestedGrade: input.requested_grade,
      reason: input.reason,
      status: input.status,
      reviewedReason: input.reviewed_reason,
      reviewer: input.reviewer
        ? await EcommerceMallSuperAdminAtSummaryTransformer.transform(
            input.reviewer,
          )
        : null,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
    } satisfies IEcommerceMallAdminRequestOfCustomer;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallAdminRequestOfCustomerTransformer {
//       export type Payload = Prisma.ecommerce_mall_admin_requestsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             actor_type: true,
//             requested_grade: true,
//             reason: true,
//             status: true,
//             reviewed_reason: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             reviewer: EcommerceMallSuperAdminAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.ecommerce_mall_admin_requestsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallAdminRequestOfCustomer> {
//         return {
//   id: {string},
//   actorType: {string},
//   requestedGrade: {string},
//   reason: {string},
//   status: {string},
//   reviewedReason: {null | string},
//   reviewer: input.reviewer ? await EcommerceMallSuperAdminAtSummaryTransformer.transform(input.reviewer) : null,
//   createdAt: {string},
//   updatedAt: {string},
//   deletedAt: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------