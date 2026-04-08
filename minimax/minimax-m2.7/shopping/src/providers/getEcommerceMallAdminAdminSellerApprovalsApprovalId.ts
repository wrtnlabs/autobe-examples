import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallAdminAdminSellerApprovalsApprovalId(props: {
  admin: AdminPayload;
  approvalId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallSellerApproval> {
  const record =
    await MyGlobal.prisma.ecommerce_mall_seller_approvals.findUniqueOrThrow({
      where: { id: props.approvalId },
      select: {
        id: true,
        status: true,
        rejection_reason: true,
        created_at: true,
        updated_at: true,
        ecommerce_mall_seller_id: true,
        seller: {
          select: {
            id: true,
            email: true,
            approval_status: true,
            rejection_reason: true,
            rejected_at: true,
            created_at: true,
            sellerSuspensions: {
              select: {
                restored_at: true,
              },
            },
            profile: {
              select: {
                name: true,
              },
            },
          },
        },
        reviewedByAdmin: {
          select: {
            id: true,
            email: true,
            name: true,
            created_at: true,
            deleted_at: true,
          },
        },
      },
    });
  const approvalHistory =
    await MyGlobal.prisma.ecommerce_mall_seller_approvals.findMany({
      where: { ecommerce_mall_seller_id: record.ecommerce_mall_seller_id },
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        status: true,
        rejection_reason: true,
        created_at: true,
        updated_at: true,
        seller: {
          select: {
            id: true,
            email: true,
            approval_status: true,
            rejection_reason: true,
            rejected_at: true,
            created_at: true,
            sellerSuspensions: {
              select: {
                restored_at: true,
              },
            },
            profile: {
              select: {
                name: true,
              },
            },
          },
        },
        reviewedByAdmin: {
          select: {
            id: true,
            email: true,
            name: true,
            created_at: true,
            deleted_at: true,
          },
        },
      },
    });
  return {
    approvalStatus: record.status,
    rejectionReason: record.rejection_reason,
    rejectedAt: record.seller.rejected_at
      ? record.seller.rejected_at.toISOString()
      : null,
    approvalHistory: approvalHistory.map(
      (item): IEcommerceMallSellerApproval.ISummary => {
        const hasActiveSuspension = item.seller.sellerSuspensions.some(
          (s) => s.restored_at === null,
        );
        return {
          id: item.id,
          status: item.status,
          rejection_reason: item.rejection_reason,
          created_at: item.created_at.toISOString(),
          updated_at: item.updated_at.toISOString(),
          seller: {
            id: item.seller.id,
            email: item.seller.email,
            approvalStatus: item.seller.approval_status,
            rejectionReason: item.seller.rejection_reason,
            rejectedAt: item.seller.rejected_at
              ? item.seller.rejected_at.toISOString()
              : null,
            createdAt: item.seller.created_at.toISOString(),
            shopName: item.seller.profile?.name ?? null,
            suspensionStatus: hasActiveSuspension ? "suspended" : "active",
          },
          reviewedByAdmin: item.reviewedByAdmin
            ? {
                id: item.reviewedByAdmin.id,
                email: item.reviewedByAdmin.email,
                name: item.reviewedByAdmin.name,
                created_at: item.reviewedByAdmin.created_at.toISOString(),
                deleted_at: item.reviewedByAdmin.deleted_at
                  ? item.reviewedByAdmin.deleted_at.toISOString()
                  : null,
              }
            : null,
        };
      },
    ),
  };
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
// Complete the code below, disregard the import part and return only the function part.
// 
// ```typescript
// import { ArrayUtil } from "@nestia/e2e";
// import { HttpException } from "@nestjs/common";
// import { Prisma } from "@prisma/sdk";
// import jwt from "jsonwebtoken";
// import typia, { tags } from "typia";
// import { v4 } from "uuid";
// import { MyGlobal } from "../MyGlobal";
// import { PasswordUtil } from "../utils/PasswordUtil";
// import { toISOStringSafe } from "../utils/toISOStringSafe"
// 
// import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
// import { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
// import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getEcommerceMallAdminAdminSellerApprovalsApprovalId(props: {
//   admin: AdminPayload;
//   approvalId: string & tags.Format<"uuid">;
// }): Promise<IEcommerceMallSellerApproval> {
//   const record = await MyGlobal.prisma.ecommerce_mall_sellers.findFirstOrThrow({
//     ...EcommerceMallSellerApprovalTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallSellerApprovalTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------