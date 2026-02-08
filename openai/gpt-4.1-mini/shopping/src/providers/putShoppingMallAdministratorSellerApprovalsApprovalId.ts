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

export async function putShoppingMallAdministratorSellerApprovalsApprovalId(props: {
  administrator: AdministratorPayload;
  approvalId: string & tags.Format<"uuid">;
  body: IShoppingMallSellerApproval.IUpdate;
}): Promise<IShoppingMallSellerApproval> {
  const validStatuses = ["pending", "approved", "rejected"] as const;
  const status = (
    props.body as {
      status?: string;
    }
  ).status;
  if (typeof status !== "string" || !validStatuses.includes(status as any)) {
    throw new HttpException("Invalid status value", 400);
  }
  const approval =
    await MyGlobal.prisma.shopping_mall_seller_approvals.findUnique({
      where: { id: props.approvalId },
    });
  if (!approval) {
    throw new HttpException("Approval not found", 404);
  }
  const rejection_reason =
    (
      props.body as {
        rejection_reason?: string | null;
      }
    ).rejection_reason ?? null;
  const now = toISOStringSafe(new Date()) as string & tags.Format<"date-time">;
  const updated = await MyGlobal.prisma.$transaction(async (tx) => {
    return await tx.shopping_mall_seller_approvals.update({
      where: { id: props.approvalId },
      data: {
        status,
        rejection_reason,
        updated_at: now,
      },
    });
  });
  return {
    id: updated.id,
    shopping_mall_seller_id: updated.shopping_mall_seller_id,
    status: updated.status,
    rejection_reason: updated.rejection_reason ?? null,
    created_at: toISOStringSafe(updated.created_at) as string &
      tags.Format<"date-time">,
    updated_at: toISOStringSafe(updated.updated_at) as string &
      tags.Format<"date-time">,
    deleted_at:
      updated.deleted_at === null
        ? null
        : (toISOStringSafe(updated.deleted_at) as string &
            tags.Format<"date-time">),
  };
}
