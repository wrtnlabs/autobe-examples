import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallSellerApprovalTransformer } from "../transformers/EcommerceMallSellerApprovalTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceMallAdminSellerApprovalsApprovalId(props: {
  admin: AdminPayload;
  approvalId: string & tags.Format<"uuid">;
  body: IEcommerceMallSellerApproval.IUpdate;
}): Promise<IEcommerceMallSellerApproval> {
  const approval =
    await MyGlobal.prisma.ecommerce_mall_seller_approvals.findUniqueOrThrow({
      where: { id: props.approvalId },
    });
  if (approval.status !== "pending") {
    throw new HttpException("Already processed", 409);
  }
  if (props.body.status === "rejected" && !props.body.rejectionReason) {
    throw new HttpException("Rejection reason is required", 400);
  }
  if (props.body.status === "approved") {
    await MyGlobal.prisma.ecommerce_mall_sellers.update({
      where: { id: approval.ecommerce_mall_seller_id },
      data: {
        approval_status: "approved",
        updated_at: new Date(),
      },
    });
  }
  const updated = await MyGlobal.prisma.ecommerce_mall_seller_approvals.update({
    where: { id: props.approvalId },
    data: {
      status: props.body.status,
      rejection_reason:
        props.body.status === "rejected" ? props.body.rejectionReason : null,
      reviewed_by_admin_id: props.admin.id,
      updated_at: new Date(),
    },
    ...EcommerceMallSellerApprovalTransformer.select(),
  });
  return await EcommerceMallSellerApprovalTransformer.transform(updated);
}
