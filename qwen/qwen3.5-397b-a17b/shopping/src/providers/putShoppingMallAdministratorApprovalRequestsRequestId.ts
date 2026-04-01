import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApprovalRequest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { ShoppingMallSellerApprovalRequestTransformer } from "../transformers/ShoppingMallSellerApprovalRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallAdministratorApprovalRequestsRequestId(props: {
  administrator: AdministratorPayload;
  requestId: string & tags.Format<"uuid">;
  body: IShoppingMallSellerApprovalRequest.IUpdate;
}): Promise<IShoppingMallSellerApprovalRequest> {
  const existing =
    await MyGlobal.prisma.shopping_mall_seller_approval_requests.findUniqueOrThrow(
      {
        where: { id: props.requestId },
        select: { id: true, status: true },
      },
    );
  if (existing.status !== "pending") {
    throw new HttpException("Request is not in pending status", 400);
  }
  if (
    props.body.status === undefined ||
    (props.body.status !== "approved" && props.body.status !== "rejected")
  ) {
    throw new HttpException("Status must be 'approved' or 'rejected'", 400);
  }
  if (
    props.body.status === "rejected" &&
    (props.body.rejection_reason === undefined ||
      props.body.rejection_reason === null ||
      props.body.rejection_reason.trim() === "")
  ) {
    throw new HttpException(
      "Rejection reason is required when status is rejected",
      400,
    );
  }
  await MyGlobal.prisma.shopping_mall_seller_approval_requests.update({
    where: { id: props.requestId },
    data: {
      status: props.body.status,
      administrator_id: props.administrator.id,
      rejection_reason:
        props.body.status === "rejected" ? props.body.rejection_reason : null,
      reviewed_at: new Date(),
      updated_at: new Date(),
    },
  });
  const updated =
    await MyGlobal.prisma.shopping_mall_seller_approval_requests.findUniqueOrThrow(
      {
        where: { id: props.requestId },
        ...ShoppingMallSellerApprovalRequestTransformer.select(),
      },
    );
  return await ShoppingMallSellerApprovalRequestTransformer.transform(updated);
}
