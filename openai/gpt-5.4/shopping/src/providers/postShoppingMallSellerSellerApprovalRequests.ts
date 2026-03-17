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
import { ShoppingMallSellerApprovalRequestCollector } from "../collectors/ShoppingMallSellerApprovalRequestCollector";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallSellerApprovalRequestTransformer } from "../transformers/ShoppingMallSellerApprovalRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallSellerSellerApprovalRequests(props: {
  seller: SellerPayload;
  body: IShoppingMallSellerApprovalRequest.ICreate;
}): Promise<IShoppingMallSellerApprovalRequest> {
  const seller = await MyGlobal.prisma.shopping_mall_sellers.findUniqueOrThrow({
    where: {
      id: props.seller.id,
    },
    select: {
      id: true,
      approval_status: true,
      deleted_at: true,
      banned: true,
      suspended: true,
    },
  });
  if (seller.deleted_at !== null || seller.banned === true) {
    throw new HttpException("Forbidden", 403);
  }
  if (seller.suspended === true) {
    throw new HttpException("Forbidden", 403);
  }
  if (seller.approval_status === "approved") {
    throw new HttpException("Seller approval is already approved.", 409);
  }
  const latest =
    await MyGlobal.prisma.shopping_mall_seller_approval_requests.findFirst({
      where: {
        shopping_mall_seller_id: props.seller.id,
        deleted_at: null,
      },
      orderBy: {
        created_at: "desc",
      },
      select: {
        id: true,
        status: true,
      },
    });
  if (latest !== null) {
    if (latest.status === "pending") {
      throw new HttpException(
        "A seller approval request is already pending review.",
        409,
      );
    }
    if (latest.status === "approved") {
      throw new HttpException("Seller approval is already approved.", 409);
    }
    if (latest.status !== "rejected") {
      throw new HttpException(
        "A new seller approval request cannot be submitted in the current state.",
        400,
      );
    }
    if (seller.approval_status !== "rejected") {
      throw new HttpException(
        "A new seller approval request cannot be submitted in the current state.",
        400,
      );
    }
  }
  const created =
    await MyGlobal.prisma.shopping_mall_seller_approval_requests.create({
      data: await ShoppingMallSellerApprovalRequestCollector.collect({
        body: props.body,
        seller: props.seller,
      }),
      ...ShoppingMallSellerApprovalRequestTransformer.select(),
    });
  return await ShoppingMallSellerApprovalRequestTransformer.transform(created);
}
