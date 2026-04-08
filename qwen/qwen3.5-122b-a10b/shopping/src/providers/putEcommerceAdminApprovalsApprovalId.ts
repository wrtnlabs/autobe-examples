import { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEcommerceSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerApproval";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceSellerApprovalTransformer } from "../transformers/EcommerceSellerApprovalTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceAdminApprovalsApprovalId(props: {
  admin: {
    id: string & tags.Format<"uuid">;
    session_id: string & tags.Format<"uuid">;
    type: "admin";
  };
  approvalId: string & tags.Format<"uuid">;
  body: IEcommerceSellerApproval.IUpdate;
}): Promise<IEcommerceSellerApproval> {
  const approval = await MyGlobal.prisma.ecommerce_seller_approvals.findUnique({
    where: { id: props.approvalId, deleted_at: null },
    select: { id: true, status: true },
  });
  if (approval === null) {
    throw new HttpException("Approval record not found", 404);
  }
  if (approval.status !== "pending") {
    throw new HttpException("Approval has already been reviewed", 409);
  }
  if (props.body.status !== "approved" && props.body.status !== "rejected") {
    throw new HttpException("Invalid status value", 400);
  }
  if (props.body.status === "rejected") {
    if (
      props.body.rejection_reason === undefined ||
      props.body.rejection_reason === null ||
      props.body.rejection_reason.trim().length === 0
    ) {
      throw new HttpException(
        "Rejection reason is required when status is rejected",
        400,
      );
    }
  }
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.ecommerce_seller_approvals.update({
    where: { id: props.approvalId },
    data: {
      status: props.body.status,
      rejection_reason:
        props.body.status === "rejected" ? props.body.rejection_reason : null,
      reviewed_by_admin_id: props.admin.id,
      reviewed_at: now,
      updated_at: now,
    },
  });
  const updated =
    await MyGlobal.prisma.ecommerce_seller_approvals.findUniqueOrThrow({
      where: { id: props.approvalId },
      ...EcommerceSellerApprovalTransformer.select(),
    });
  return await EcommerceSellerApprovalTransformer.transform(updated);
}
