import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEcommerceMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminPromotionRequest";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallAdminAtSummaryTransformer } from "./EcommerceMallAdminAtSummaryTransformer";
import { EcommerceMallSellerAtSummaryTransformer } from "./EcommerceMallSellerAtSummaryTransformer";

export namespace EcommerceMallAdminPromotionRequestAtSummaryTransformer {
  export type Payload =
    Prisma.ecommerce_mall_admin_promotion_requestsGetPayload<
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
        reviewer: EcommerceMallAdminAtSummaryTransformer.select(),
        snapshots: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_mall_admin_promotion_request_snapshotsFindManyArgs,
        sellerRequest: {
          select: {
            seller: EcommerceMallSellerAtSummaryTransformer.select(),
          },
        } satisfies Prisma.ecommerce_mall_admin_promotion_request_sellersFindManyArgs,
        customerSubtype: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_mall_admin_promotion_request_customersFindManyArgs,
      },
    } satisfies Prisma.ecommerce_mall_admin_promotion_requestsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallAdminPromotionRequest.ISummary> {
    const requester:
      | IEcommerceMallCustomer.ISummary
      | IEcommerceMallSeller.ISummary = input.sellerRequest?.seller
      ? await EcommerceMallSellerAtSummaryTransformer.transform(
          input.sellerRequest.seller,
        )
      : ({} as IEcommerceMallCustomer.ISummary);
    return {
      id: input.id,
      status: input.status as "pending" | "approved" | "rejected",
      reason: input.reason,
      rejectionReason: input.rejection_reason ?? null,
      createdAt: input.created_at.toISOString(),
      requester,
      reviewer: input.reviewer
        ? await EcommerceMallAdminAtSummaryTransformer.transform(input.reviewer)
        : null,
    };
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallAdminPromotionRequestAtSummaryTransformer {
//       export type Payload = Prisma.ecommerce_mall_admin_promotion_requestsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             status: true,
//             reason: true,
//             rejection_reason: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             reviewer: EcommerceMallAdminAtSummaryTransformer.select(),
//             ...
//           },
//         } satisfies Prisma.ecommerce_mall_admin_promotion_requestsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallAdminPromotionRequest.ISummary> {
//         return {
//   id: {string},
//   status: {"pending" | "approved" | "rejected"},
//   reason: {string},
//   rejectionReason: {string | null},
//   createdAt: {string},
//   requester: {IEcommerceMallCustomer.ISummary | IEcommerceMallSeller.ISummary},
//   reviewer: input.reviewer ? await EcommerceMallAdminAtSummaryTransformer.transform(input.reviewer) : null,
//         };
//       }
//     }
//--------------------------------------------------------------