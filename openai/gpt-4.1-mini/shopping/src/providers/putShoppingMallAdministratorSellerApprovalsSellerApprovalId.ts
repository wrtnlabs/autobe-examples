import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApproval";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { ShoppingMallSellerApprovalTransformer } from "../transformers/ShoppingMallSellerApprovalTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallAdministratorSellerApprovalsSellerApprovalId(props: {
  administrator: AdministratorPayload;
  sellerApprovalId: string & tags.Format<"uuid">;
  body: IShoppingMallSellerApproval.IUpdate;
}): Promise<IShoppingMallSellerApproval> {
  // Ensure the approval exists or throw 404
  await MyGlobal.prisma.shopping_mall_seller_approvals.findUniqueOrThrow({
    where: { id: props.sellerApprovalId },
  });
  // Validate status if provided
  if (props.body.status !== undefined) {
    const validStatuses = ["pending", "approved", "rejected"] as const;
    if (!validStatuses.includes(props.body.status)) {
      throw new HttpException("Invalid status value", 400);
    }
  }
  // Prepare update data
  const data: {
    status?: "pending" | "approved" | "rejected";
    rejection_reason?: string | null;
    updated_at: string & tags.Format<"date-time">;
  } = {
    updated_at: toISOStringSafe(new Date()),
  };
  if (props.body.status !== undefined) {
    data.status = props.body.status;
  }
  if (props.body.rejectionReason !== undefined) {
    data.rejection_reason = props.body.rejectionReason ?? null;
  }
  // Perform the update
  const updated = await MyGlobal.prisma.shopping_mall_seller_approvals.update({
    where: { id: props.sellerApprovalId },
    data,
    ...ShoppingMallSellerApprovalTransformer.select(),
  });
  // Transform to response DTO
  return await ShoppingMallSellerApprovalTransformer.transform(updated);
}
