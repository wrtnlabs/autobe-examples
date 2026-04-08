import { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApprovalRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallAdministratorAtSummaryTransformer } from "./EcommerceMallAdministratorAtSummaryTransformer";
import { EcommerceMallSellerAtSummaryTransformer } from "./EcommerceMallSellerAtSummaryTransformer";

export namespace EcommerceMallSellerApprovalRequestTransformer {
  export type Payload =
    Prisma.ecommerce_mall_seller_approval_requestsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        status: true,
        request_reason: true,
        rejection_reason: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        seller: EcommerceMallSellerAtSummaryTransformer.select(),
        reviewer: EcommerceMallAdministratorAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_mall_seller_approval_requestsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallSellerApprovalRequest> {
    return {
      id: input.id,
      seller: await EcommerceMallSellerAtSummaryTransformer.transform(
        input.seller,
      ),
      status: input.status,
      requestReason: input.request_reason,
      reviewer: input.reviewer
        ? await EcommerceMallAdministratorAtSummaryTransformer.transform(
            input.reviewer,
          )
        : null,
      rejectionReason: input.rejection_reason,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
    } satisfies IEcommerceMallSellerApprovalRequest;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallSellerApprovalRequestTransformer {
//       export type Payload = Prisma.ecommerce_mall_seller_approval_requestsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             status: true,
//             request_reason: true,
//             rejection_reason: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             seller: EcommerceMallSellerAtSummaryTransformer.select(),
//             reviewer: EcommerceMallAdministratorAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.ecommerce_mall_seller_approval_requestsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallSellerApprovalRequest> {
//         return {
//   id: {string},
//   seller: await EcommerceMallSellerAtSummaryTransformer.transform(input.seller),
//   status: {string},
//   requestReason: {string},
//   reviewer: input.reviewer ? await EcommerceMallAdministratorAtSummaryTransformer.transform(input.reviewer) : null,
//   rejectionReason: {string | null},
//   createdAt: {string},
//   updatedAt: {string},
//   deletedAt: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------