import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApprovalRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallSellerApprovalRequestTransformer } from "../transformers/EcommerceMallSellerApprovalRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceMallAdminApprovalRequestsApprovalRequestId(props: {
  admin: AdminPayload;
  approvalRequestId: string & tags.Format<"uuid">;
  body: IEcommerceMallSellerApprovalRequest.IUpdate;
}): Promise<IEcommerceMallSellerApprovalRequest> {
  const { approvalRequestId, body } = props;
  const { status, rejection_reason } = body;
  if (status === "rejected" && rejection_reason === null) {
    throw new HttpException(
      "Rejection reason is required when status is rejected",
      400,
    );
  }
  if (status === "approved" && rejection_reason !== null) {
    throw new HttpException(
      "Rejection reason must be null when status is approved",
      400,
    );
  }
  const updated = await MyGlobal.prisma.$transaction(async (tx) => {
    const existing =
      await tx.ecommerce_mall_seller_approval_requests.findUniqueOrThrow({
        where: { id: approvalRequestId, deleted_at: null },
      });
    await tx.ecommerce_mall_seller_approval_snapshots.create({
      data: {
        id: v4(),
        ecommerce_mall_seller_approval_request_id: existing.id,
        ecommerce_mall_seller_id: existing.seller_id,
        actor_id: props.admin.id,
        actor_type: "admin" as const,
        from_status: existing.status,
        to_status: status,
        rejection_reason,
        created_at: new Date(),
      },
    });
    return tx.ecommerce_mall_seller_approval_requests.update({
      where: { id: approvalRequestId },
      data: {
        status,
        rejection_reason,
        updated_at: new Date(),
      },
      ...EcommerceMallSellerApprovalRequestTransformer.select(),
    });
  });
  return await EcommerceMallSellerApprovalRequestTransformer.transform(updated);
}
