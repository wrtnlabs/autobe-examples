import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
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

export async function getMallPlatformAdministratorSellerAccountsSellerAccountId(props: {
  administrator: AdministratorPayload;
  sellerAccountId: string & tags.Format<"uuid">;
}): Promise<IMallPlatformSellerAccount> {
  const sellerAccount =
    await MyGlobal.prisma.mall_platform_seller_accounts.findFirstOrThrow({
      where: {
        id: props.sellerAccountId,
        deleted_at: null,
      },
      select: {
        id: true,
        email: true,
        approval_status: true,
        rejection_reason: true,
        suspended_at: true,
        deleted_at: true,
        created_at: true,
        updated_at: true,
      },
    });
  return {
    id: sellerAccount.id,
    email: sellerAccount.email,
    approvalStatus: sellerAccount.approval_status,
    rejectionReason: sellerAccount.rejection_reason,
    suspendedAt:
      sellerAccount.suspended_at === null
        ? null
        : sellerAccount.suspended_at.toISOString(),
    deletedAt:
      sellerAccount.deleted_at === null
        ? null
        : sellerAccount.deleted_at.toISOString(),
    createdAt: sellerAccount.created_at.toISOString(),
    updatedAt: sellerAccount.updated_at.toISOString(),
  };
}
