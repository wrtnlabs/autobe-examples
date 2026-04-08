import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
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

export namespace EcommerceMallSellerApprovalAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_mall_seller_approvalsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        status: true,
        rejection_reason: true,
        created_at: true,
        updated_at: true,
        seller: EcommerceMallSellerAtSummaryTransformer.select(),
        reviewedByAdmin: EcommerceMallAdminAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_mall_seller_approvalsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallSellerApproval.ISummary> {
    return {
      id: input.id,
      status: input.status,
      rejection_reason: input.rejection_reason,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      seller: await EcommerceMallSellerAtSummaryTransformer.transform(
        input.seller,
      ),
      reviewedByAdmin: input.reviewedByAdmin
        ? await EcommerceMallAdminAtSummaryTransformer.transform(
            input.reviewedByAdmin,
          )
        : null,
    } satisfies IEcommerceMallSellerApproval.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallSellerApprovalAtSummaryTransformer {
//       export type Payload = Prisma.ecommerce_mall_seller_approvalsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             status: true,
//             rejection_reason: true,
//             created_at: true,
//             updated_at: true,
//             seller: EcommerceMallSellerAtSummaryTransformer.select(),
//             reviewedByAdmin: EcommerceMallAdminAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.ecommerce_mall_seller_approvalsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallSellerApproval.ISummary> {
//         return {
//   created_at: {string},
//   id: {string},
//   rejection_reason: {string | null},
//   reviewedByAdmin: input.reviewedByAdmin ? await EcommerceMallAdminAtSummaryTransformer.transform(input.reviewedByAdmin) : null,
//   seller: await EcommerceMallSellerAtSummaryTransformer.transform(input.seller),
//   status: {string},
//   updated_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------