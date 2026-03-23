import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
  const existing =
    await MyGlobal.prisma.shopping_mall_seller_approval_requests.findFirst({
      where: {
        shopping_mall_seller_id: props.seller.id,
        status: "pending",
        deleted_at: null,
      },
    });
  if (existing !== null) {
    throw new HttpException("A pending approval request already exists", 400);
  }
  const created =
    await MyGlobal.prisma.shopping_mall_seller_approval_requests.create({
      data: await ShoppingMallSellerApprovalRequestCollector.collect({
        body: props.body,
        shoppingMallSellers: { id: props.seller.id },
      }),
      ...ShoppingMallSellerApprovalRequestTransformer.select(),
    });
  return await ShoppingMallSellerApprovalRequestTransformer.transform(created);
}
