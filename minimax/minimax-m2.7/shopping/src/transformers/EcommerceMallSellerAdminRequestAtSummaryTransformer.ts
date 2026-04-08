import { IEcommerceMallSellerAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerAdminRequest";
import { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallSuperAdminAtSummaryTransformer } from "./EcommerceMallSuperAdminAtSummaryTransformer";

export namespace EcommerceMallSellerAdminRequestAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_mall_seller_admin_requestsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        status: true,
        reason: true,
        rejection_reason: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        seller: {
          select: { id: true },
        },
        reviewedBySuperAdmin:
          EcommerceMallSuperAdminAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_mall_seller_admin_requestsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallSellerAdminRequest.ISummary> {
    return {
      id: input.id,
      status: input.status,
      reason: input.reason,
      rejection_reason: input.rejection_reason,
      created_at: input.created_at.toISOString(),
      reviewedBySuperAdmin: input.reviewedBySuperAdmin
        ? await EcommerceMallSuperAdminAtSummaryTransformer.transform(
            input.reviewedBySuperAdmin,
          )
        : null,
    } satisfies IEcommerceMallSellerAdminRequest.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallSellerAdminRequestAtSummaryTransformer {
//       export type Payload = Prisma.ecommerce_mall_seller_admin_requestsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             reason: true,
//             status: true,
//             rejection_reason: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             ecommerce_mall_seller_id: true,
//             reviewedBySuperAdmin: EcommerceMallSuperAdminAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.ecommerce_mall_seller_admin_requestsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallSellerAdminRequest.ISummary> {
//         return {
//   id: {string},
//   status: {string},
//   reason: {string},
//   rejection_reason: {string | null},
//   created_at: {string},
//   reviewedBySuperAdmin: input.reviewedBySuperAdmin ? await EcommerceMallSuperAdminAtSummaryTransformer.transform(input.reviewedBySuperAdmin) : null,
//         };
//       }
//     }
//--------------------------------------------------------------