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
import { EcommerceMallSellerApprovalAtSummaryTransformer } from "./EcommerceMallSellerApprovalAtSummaryTransformer";

export namespace EcommerceMallSellerApprovalTransformer {
  export type Payload = Prisma.ecommerce_mall_sellersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        password_hash: true,
        approval_status: true,
        rejection_reason: true,
        rejected_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        sellerSessions: true,
        passwordResets: true,
        emailVerifications: true,
        adminRequest: true,
        profile: true,
        adminRequests: true,
        products: true,
        productSnapshots: true,
        shipments: true,
        cancellationRequests: true,
        refundRequests: true,
        refundRequestSnapshots: true,
        sellerApprovals:
          EcommerceMallSellerApprovalAtSummaryTransformer.select(),
        sellerSuspensions: true,
      },
    } satisfies Prisma.ecommerce_mall_sellersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallSellerApproval> {
    return {
      approvalStatus: input.approval_status,
      rejectionReason: input.rejection_reason,
      rejectedAt: input.rejected_at ? input.rejected_at.toISOString() : null,
      approvalHistory: await ArrayUtil.asyncMap(
        input.sellerApprovals,
        EcommerceMallSellerApprovalAtSummaryTransformer.transform,
      ),
    };
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallSellerApprovalTransformer {
//       export type Payload = Prisma.ecommerce_mall_sellersGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             email: true,
//             password_hash: true,
//             approval_status: true,
//             rejection_reason: true,
//             rejected_at: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             sellerApprovals: EcommerceMallSellerApprovalAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.ecommerce_mall_sellersFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallSellerApproval> {
//         return {
//   approvalStatus: {string},
//   rejectionReason: {string | null},
//   rejectedAt: {string | null},
//   approvalHistory: await ArrayUtil.asyncMap(input.sellerApprovals, EcommerceMallSellerApprovalAtSummaryTransformer.transform),
//         };
//       }
//     }
//--------------------------------------------------------------