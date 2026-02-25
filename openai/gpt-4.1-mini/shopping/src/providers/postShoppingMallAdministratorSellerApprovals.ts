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
import { ShoppingMallSellerApprovalCollector } from "../collectors/ShoppingMallSellerApprovalCollector";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { ShoppingMallSellerApprovalTransformer } from "../transformers/ShoppingMallSellerApprovalTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAdministratorSellerApprovals(props: {
  administrator: AdministratorPayload;
  body: IShoppingMallSellerApproval.ICreate;
}): Promise<IShoppingMallSellerApproval> {
  const existingApproval =
    await MyGlobal.prisma.shopping_mall_seller_approvals.findUnique({
      where: { shopping_mall_seller_id: props.body.shoppingMallSellerId },
    });
  if (!existingApproval) {
    const data = await ShoppingMallSellerApprovalCollector.collect({
      body: props.body,
    });
    const created = await MyGlobal.prisma.shopping_mall_seller_approvals.create(
      {
        data,
        ...ShoppingMallSellerApprovalTransformer.select(),
      },
    );
    return await ShoppingMallSellerApprovalTransformer.transform(created);
  }
  return await MyGlobal.prisma.$transaction(async (tx) => {
    const updatedApproval = await tx.shopping_mall_seller_approvals.update({
      where: { shopping_mall_seller_id: props.body.shoppingMallSellerId },
      data: {
        status: props.body.status,
        rejection_reason: props.body.rejectionReason ?? null,
        updated_at: new Date().toISOString() as string &
          import("typia").tags.Format<"date-time">,
      },
      ...ShoppingMallSellerApprovalTransformer.select(),
    });
    if (props.body.status === "approved") {
      await tx.shopping_mall_sellers.update({
        where: { id: props.body.shoppingMallSellerId },
        data: { approval_status: "approved" },
      });
    } else if (props.body.status === "rejected") {
      await tx.shopping_mall_sellers.update({
        where: { id: props.body.shoppingMallSellerId },
        data: {
          approval_status: "rejected",
          rejection_reason: props.body.rejectionReason ?? null,
        },
      });
    }
    return await ShoppingMallSellerApprovalTransformer.transform(
      updatedApproval,
    );
  });
}
