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

export async function postShoppingMallAdministratorSellerApprovalsSellerApprovalIdApprove(props: {
  administrator: AdministratorPayload;
  sellerApprovalId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSellerApproval> {
  const current =
    await MyGlobal.prisma.shopping_mall_seller_approvals.findUniqueOrThrow({
      where: { id: props.sellerApprovalId },
    });
  if (current.status !== "pending") {
    throw new HttpException(
      "Seller approval is not pending and cannot be approved",
      400,
    );
  }
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const updated: Prisma.shopping_mall_seller_approvalsGetPayload<
    ReturnType<typeof ShoppingMallSellerApprovalTransformer.select>
  > = await MyGlobal.prisma.$transaction(async (tx) => {
    return tx.shopping_mall_seller_approvals.update({
      where: { id: props.sellerApprovalId },
      data: {
        status: "approved",
        rejection_reason: null,
        updated_at: now,
      },
      ...ShoppingMallSellerApprovalTransformer.select(),
    });
  });
  return await ShoppingMallSellerApprovalTransformer.transform(updated);
}
