import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApprovalRequest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallSellerApprovalRequestTransformer } from "../transformers/ShoppingMallSellerApprovalRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallAdminApprovalRequestsRequestId(props: {
  admin: AdminPayload;
  requestId: string & tags.Format<"uuid">;
  body: IShoppingMallSellerApprovalRequest.IUpdate;
}): Promise<IShoppingMallSellerApprovalRequest> {
  const existing =
    await MyGlobal.prisma.shopping_mall_seller_approval_requests.findUniqueOrThrow(
      {
        where: { id: props.requestId, deleted_at: null },
        select: { id: true, status: true, seller_id: true },
      },
    );
  if (existing.status !== "pending") {
    throw new HttpException("Approval request is not pending", 400);
  }
  if (props.body.status !== "approved" && props.body.status !== "rejected") {
    throw new HttpException("Status must be 'approved' or 'rejected'", 400);
  }
  if (
    props.body.status === "rejected" &&
    (!props.body.rejection_reason ||
      props.body.rejection_reason.trim().length === 0)
  ) {
    throw new HttpException("Rejection reason is required when rejecting", 400);
  }
  const now = new Date();
  await MyGlobal.prisma.shopping_mall_seller_approval_requests.update({
    where: { id: props.requestId },
    data: {
      status: props.body.status,
      rejection_reason: props.body.rejection_reason ?? null,
      reviewed_by_admin_id: props.admin.id,
      updated_at: now,
    },
  });
  if (props.body.status === "approved") {
    await MyGlobal.prisma.shopping_mall_sellers.update({
      where: { id: existing.seller_id },
      data: {
        approval_status: "approved",
        updated_at: now,
      },
    });
  }
  const updated =
    await MyGlobal.prisma.shopping_mall_seller_approval_requests.findUniqueOrThrow(
      {
        where: { id: props.requestId },
        ...ShoppingMallSellerApprovalRequestTransformer.select(),
      },
    );
  return await ShoppingMallSellerApprovalRequestTransformer.transform(updated);
}
