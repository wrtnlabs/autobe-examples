import { IEcommerceMallAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequest";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallCustomerAtSummaryTransformer } from "./EcommerceMallCustomerAtSummaryTransformer";
import { EcommerceMallSellerAtSummaryTransformer } from "./EcommerceMallSellerAtSummaryTransformer";
import { EcommerceMallSuperAdminAtSummaryTransformer } from "./EcommerceMallSuperAdminAtSummaryTransformer";

export namespace EcommerceMallAdminRequestAtSummaryTransformer {
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
            customer: EcommerceMallCustomerAtSummaryTransformer.select(),
          },
        },
        adminRequestOfSeller: {
          select: {
            seller: EcommerceMallSellerAtSummaryTransformer.select(),
          },
        },
      },
    } satisfies Prisma.ecommerce_mall_admin_requestsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallAdminRequest.ISummary> {
    // Polymorphic actor: determine based on actor_type
    let actor: IEcommerceMallAdminRequest.ISummary["actor"];
    if (input.actor_type === "customer" && input.customer) {
      actor = await EcommerceMallCustomerAtSummaryTransformer.transform(
        input.customer.customer,
      );
    } else if (input.actor_type === "seller" && input.adminRequestOfSeller) {
      actor = await EcommerceMallSellerAtSummaryTransformer.transform(
        input.adminRequestOfSeller.seller,
      );
    } else {
      actor = undefined;
    }
    return {
      id: input.id,
      actorType: input.actor_type as "customer" | "seller",
      createdAt: toISOStringSafe(input.created_at),
      deletedAt: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
      reason: input.reason,
      requestedGrade: input.requested_grade as "admin" | "super_admin",
      reviewedReason: input.reviewed_reason ?? undefined,
      reviewer: input.reviewer
        ? await EcommerceMallSuperAdminAtSummaryTransformer.transform(
            input.reviewer,
          )
        : undefined,
      status: input.status as "pending" | "approved" | "rejected",
      updatedAt: toISOStringSafe(input.updated_at),
      actor,
    } satisfies IEcommerceMallAdminRequest.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallAdminRequestAtSummaryTransformer {
//       export type Payload = Prisma.ecommerce_mall_admin_requestsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             actorType: true,
//             createdAt: true,
//             deletedAt: true,
//             id: true,
//             reason: true,
//             requestedGrade: true,
//             reviewedReason: true,
//             status: true,
//             updatedAt: true,
//             ...
//           },
//         } satisfies Prisma.ecommerce_mall_admin_requestsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallAdminRequest.ISummary> {
//         return {
//   actor: {IEcommerceMallCustomer.ISummary | IEcommerceMallSeller.ISummary},
//   actorType: {"customer" | "seller"},
//   createdAt: {string},
//   deletedAt: {string | null},
//   id: {string},
//   reason: {string},
//   requestedGrade: {"admin" | "super_admin"},
//   reviewedReason: {string},
//   reviewer: {IEcommerceMallSuperAdmin.ISummary},
//   status: {"pending" | "approved" | "rejected"},
//   updatedAt: {string},
//         };
//       }
//     }
//--------------------------------------------------------------