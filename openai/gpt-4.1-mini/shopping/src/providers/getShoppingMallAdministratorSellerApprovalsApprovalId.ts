import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApproval";
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

export async function getShoppingMallAdministratorSellerApprovalsApprovalId(props: {
  administrator: AdministratorPayload;
  approvalId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSellerApproval> {
  const record =
    await MyGlobal.prisma.shopping_mall_seller_approvals.findUnique({
      where: { id: props.approvalId },
    });
  if (!record) throw new HttpException("Seller approval not found", 404);
  return {
    id: record.id,
    shopping_mall_seller_id: record.shopping_mall_seller_id,
    status: record.status,
    rejection_reason:
      record.rejection_reason === null ? null : record.rejection_reason,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at:
      record.deleted_at === null ? null : toISOStringSafe(record.deleted_at),
  };
}
