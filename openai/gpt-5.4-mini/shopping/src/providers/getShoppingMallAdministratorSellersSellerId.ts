import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallAdministratorSellersSellerId(props: {
  administrator: AdministratorPayload;
  sellerId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSeller> {
  if (props.administrator.type !== "administrator") {
    throw new HttpException("Forbidden", 403);
  }
  const seller = await MyGlobal.prisma.shopping_mall_sellers.findUniqueOrThrow({
    where: { id: props.sellerId },
    select: {
      id: true,
      email: true,
      approval_status: true,
      rejection_reason: true,
      account_status: true,
      approved_at: true,
      rejected_at: true,
      suspended_at: true,
      banned_at: true,
      last_login_at: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  return {
    id: seller.id,
    email: seller.email,
    approvalStatus: seller.approval_status,
    rejectionReason: seller.rejection_reason,
    accountStatus: seller.account_status,
    approvedAt: seller.approved_at?.toISOString() ?? null,
    rejectedAt: seller.rejected_at?.toISOString() ?? null,
    suspendedAt: seller.suspended_at?.toISOString() ?? null,
    bannedAt: seller.banned_at?.toISOString() ?? null,
    lastLoginAt: seller.last_login_at?.toISOString() ?? null,
    createdAt: seller.created_at.toISOString(),
    updatedAt: seller.updated_at.toISOString(),
    deletedAt: seller.deleted_at?.toISOString() ?? null,
  };
}
