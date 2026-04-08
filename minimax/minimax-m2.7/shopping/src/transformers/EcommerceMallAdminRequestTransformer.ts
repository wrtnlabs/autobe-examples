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

export namespace EcommerceMallAdminRequestTransformer {
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
        } satisfies Prisma.ecommerce_mall_admin_request_of_customersFindManyArgs,
        adminRequestOfSeller: {
          select: {
            seller: EcommerceMallSellerAtSummaryTransformer.select(),
          },
        } satisfies Prisma.ecommerce_mall_admin_request_of_sellersFindManyArgs,
      },
    } satisfies Prisma.ecommerce_mall_admin_requestsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallAdminRequest> {
    return {
      id: input.id,
      actorType: input.actor_type,
      requestedGrade: input.requested_grade,
      reason: input.reason,
      status: input.status,
      reviewer: input.reviewer
        ? await EcommerceMallSuperAdminAtSummaryTransformer.transform(
            input.reviewer,
          )
        : null,
      customer:
        input.actor_type === "customer" && input.customer != null
          ? await EcommerceMallCustomerAtSummaryTransformer.transform(
              input.customer.customer,
            )
          : undefined,
      seller:
        input.actor_type === "seller" && input.adminRequestOfSeller != null
          ? await EcommerceMallSellerAtSummaryTransformer.transform(
              input.adminRequestOfSeller.seller,
            )
          : undefined,
      reviewedReason: input.reviewed_reason ?? null,
      createdAt: toISOStringSafe(input.created_at),
      updatedAt: toISOStringSafe(input.updated_at),
      deletedAt:
        input.deleted_at != null ? toISOStringSafe(input.deleted_at) : null,
    } satisfies IEcommerceMallAdminRequest;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallAdminRequestTransformer {
//       export type Payload = Prisma.ecommerce_mall_admin_requestsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             actorType: true,
//             requestedGrade: true,
//             reason: true,
//             status: true,
//             reviewedReason: true,
//             createdAt: true,
//             updatedAt: true,
//             deletedAt: true,
//             ...
//           },
//         } satisfies Prisma.ecommerce_mall_admin_requestsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallAdminRequest> {
//         return {
//   id: {string},
//   actorType: {string},
//   requestedGrade: {string},
//   reason: {string},
//   status: {string},
//   reviewer: {IEcommerceMallSuperAdmin.ISummary | null},
//   customer: {IEcommerceMallCustomer.ISummary},
//   seller: {IEcommerceMallSeller.ISummary},
//   reviewedReason: {string | null},
//   createdAt: {string},
//   updatedAt: {string},
//   deletedAt: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------