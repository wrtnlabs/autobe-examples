import { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import { IEcommerceMallAdministratorApprovalRequests } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministratorApprovalRequests";
import { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallAdministratorAtSummaryTransformer } from "./EcommerceMallAdministratorAtSummaryTransformer";
import { EcommerceMallMemberAtSummaryTransformer } from "./EcommerceMallMemberAtSummaryTransformer";
import { EcommerceMallSellerAtSummaryTransformer } from "./EcommerceMallSellerAtSummaryTransformer";
import { EcommerceMallSuperAdministratorAtSummaryTransformer } from "./EcommerceMallSuperAdministratorAtSummaryTransformer";

export namespace EcommerceMallAdministratorApprovalRequestsTransformer {
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
        requestingMember: EcommerceMallMemberAtSummaryTransformer.select(),
        requestingSeller: EcommerceMallSellerAtSummaryTransformer.select(),
        reviewingSuperAdmin:
          EcommerceMallSuperAdministratorAtSummaryTransformer.select(),
        createdAdmin: EcommerceMallAdministratorAtSummaryTransformer.select(),
        snapshots: true,
      },
    } satisfies Prisma.ecommerce_mall_administrator_approval_requestsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallAdministratorApprovalRequests> {
    return {
      id: input.id,
      status: input.status,
      reason: input.reason,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      requestingMember: input.requestingMember
        ? await EcommerceMallMemberAtSummaryTransformer.transform(
            input.requestingMember,
          )
        : null,
      requestingSeller: input.requestingSeller
        ? await EcommerceMallSellerAtSummaryTransformer.transform(
            input.requestingSeller,
          )
        : null,
      reviewingSuperAdmin: input.reviewingSuperAdmin
        ? await EcommerceMallSuperAdministratorAtSummaryTransformer.transform(
            input.reviewingSuperAdmin,
          )
        : null,
      createdAdmin: input.createdAdmin
        ? await EcommerceMallAdministratorAtSummaryTransformer.transform(
            input.createdAdmin,
          )
        : null,
    } satisfies IEcommerceMallAdministratorApprovalRequests;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallAdministratorApprovalRequestsTransformer {
//       export type Payload = Prisma.ecommerce_mall_administrator_approval_requestsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             status: true,
//             reason: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             requestingMember: EcommerceMallMemberAtSummaryTransformer.select(),
//             requestingSeller: EcommerceMallSellerAtSummaryTransformer.select(),
//             reviewingSuperAdmin: EcommerceMallSuperAdministratorAtSummaryTransformer.select(),
//             createdAdmin: EcommerceMallAdministratorAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.ecommerce_mall_administrator_approval_requestsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallAdministratorApprovalRequests> {
//         return {
//   id: {string},
//   status: {string},
//   reason: {string},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//   requestingMember: input.requestingMember ? await EcommerceMallMemberAtSummaryTransformer.transform(input.requestingMember) : null,
//   requestingSeller: input.requestingSeller ? await EcommerceMallSellerAtSummaryTransformer.transform(input.requestingSeller) : null,
//   reviewingSuperAdmin: input.reviewingSuperAdmin ? await EcommerceMallSuperAdministratorAtSummaryTransformer.transform(input.reviewingSuperAdmin) : null,
//   createdAdmin: input.createdAdmin ? await EcommerceMallAdministratorAtSummaryTransformer.transform(input.createdAdmin) : null,
//         };
//       }
//     }
//--------------------------------------------------------------