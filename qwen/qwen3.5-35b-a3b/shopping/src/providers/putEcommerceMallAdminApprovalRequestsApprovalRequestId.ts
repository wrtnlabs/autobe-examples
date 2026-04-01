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
  const approvalRequest =
    await MyGlobal.prisma.ecommerce_mall_seller_approval_requests.findUniqueOrThrow(
      {
        where: {
          id: props.approvalRequestId,
          deleted_at: null,
        },
        select: {
          id: true,
          status: true,
          seller_id: true,
          created_at: true,
        },
      },
    );
  if (approvalRequest.status === props.body.status) {
    throw new HttpException("Status cannot be updated to the same value", 400);
  }
  if (
    props.body.status === "rejected" &&
    props.body.rejection_reason === null
  ) {
    throw new HttpException(
      "rejection_reason is required when status is rejected",
      400,
    );
  }
  if (
    props.body.status === "approved" &&
    props.body.rejection_reason !== null
  ) {
    throw new HttpException(
      "rejection_reason must be null when status is approved",
      400,
    );
  }
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.$transaction(async (tx) => {
    const snapshot = await tx.ecommerce_mall_seller_approval_snapshots.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        ecommerce_mall_seller_approval_request_id: props.approvalRequestId,
        ecommerce_mall_seller_id: approvalRequest.seller_id,
        actor_type: "Admin",
        actor_id: props.admin.id,
        from_status: approvalRequest.status,
        to_status: props.body.status,
        created_at: now,
      },
    });
    const updated = await tx.ecommerce_mall_seller_approval_requests.update({
      where: {
        id: props.approvalRequestId,
      },
      data: {
        status: props.body.status,
        rejection_reason: props.body.rejection_reason,
        updated_at: now,
      },
    });
    return updated;
  });
  const queryResult =
    await MyGlobal.prisma.ecommerce_mall_seller_approval_requests.findUniqueOrThrow(
      {
        where: {
          id: props.approvalRequestId,
        },
        ...EcommerceMallSellerApprovalRequestTransformer.select(),
      },
    );
  return await EcommerceMallSellerApprovalRequestTransformer.transform(
    queryResult,
  );
}
