import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApproval";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallSuperAdminSellerApprovalsApprovalId(props: {
  superAdmin: SuperadminPayload;
  approvalId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSellerApproval> {
  const record = await (
    MyGlobal.prisma as any
  ).shopping_mall_seller_approvals.findFirst({
    where: {
      id: props.approvalId,
    },
    include: {
      seller: {
        include: {
          customer: {
            include: {
              member: true,
            },
          },
        },
      },
    },
  });
  if (record === null || record === undefined) {
    throw new HttpException(
      `Seller approval not found: ${props.approvalId}`,
      404,
    );
  }
  const seller: IShoppingMallSeller = {
    id: record.seller.id,
    createdAt: toISOStringSafe(record.seller.created_at),
  } as unknown as IShoppingMallSeller;
  return {
    id: record.id,
    seller,
    status: record.status,
    submitted_at: toISOStringSafe(record.submitted_at),
    reviewed_at: toISOStringSafe(record.reviewed_at),
    rejection_reason: record.rejection_reason ?? null,
    approved_at: toISOStringSafe(record.approved_at),
    rejected_at:
      record.rejected_at !== null && record.rejected_at !== undefined
        ? toISOStringSafe(record.rejected_at)
        : null,
    created_at: toISOStringSafe(record.created_at),
  } as unknown as IShoppingMallSellerApproval;
}
