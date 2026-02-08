import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function deleteShoppingMallAdministratorSellerApprovalsApprovalId(props: {
  administrator: {
    id: string & tags.Format<"uuid">;
    session_id: string & tags.Format<"uuid">;
    type: "administrator";
  };
  approvalId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Check if the seller approval exists
  const approval =
    await MyGlobal.prisma.shopping_mall_seller_approvals.findUnique({
      where: { id: props.approvalId },
      select: { id: true },
    });
  if (!approval) {
    throw new HttpException("Seller approval not found", 404);
  }
  // Delete the seller approval record
  await MyGlobal.prisma.shopping_mall_seller_approvals.delete({
    where: { id: props.approvalId },
  });
  // Audit log entry
  console.log(
    `Administrator ${props.administrator.id} deleted seller approval ${props.approvalId}`,
  );
}
