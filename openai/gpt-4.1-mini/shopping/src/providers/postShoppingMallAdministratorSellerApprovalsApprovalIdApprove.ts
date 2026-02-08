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

export async function postShoppingMallAdministratorSellerApprovalsApprovalIdApprove(props: {
  administrator: AdministratorPayload;
  approvalId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSellerApproval> {
  const record =
    await MyGlobal.prisma.shopping_mall_seller_approvals.findUnique({
      where: { id: props.approvalId },
    });
  if (!record) throw new HttpException("Seller approval not found", 404);
  if (record.status !== "pending" && record.status !== "rejected") {
    throw new HttpException(
      "Seller approval cannot be approved from current status",
      400,
    );
  }
  const updated = await MyGlobal.prisma.$transaction(async (prisma) => {
    const now = toISOStringSafe(new Date());
    return await prisma.shopping_mall_seller_approvals.update({
      where: { id: props.approvalId },
      data: {
        status: "approved",
        rejection_reason: null,
        updated_at: now,
      },
    });
  });
  return updated;
}
