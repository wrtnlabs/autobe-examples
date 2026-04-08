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
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallSellerApprovalRequestTransformer } from "../transformers/ShoppingMallSellerApprovalRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallSellerApprovalRequests(props: {
  seller: SellerPayload;
}): Promise<IShoppingMallSellerApprovalRequest> {
  const existingPending =
    await MyGlobal.prisma.shopping_mall_seller_approval_requests.findFirst({
      where: {
        seller_id: props.seller.id,
        status: "pending",
        deleted_at: null,
      },
    });
  if (existingPending !== null) {
    throw new HttpException(
      "Conflict: Seller already has a pending approval request",
      409,
    );
  }
  const created =
    await MyGlobal.prisma.shopping_mall_seller_approval_requests.create({
      data: {
        id: v4(),
        seller_id: props.seller.id,
        status: "pending",
        reviewed_by_admin_id: null,
        rejection_reason: null,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      },
      ...ShoppingMallSellerApprovalRequestTransformer.select(),
    });
  return await ShoppingMallSellerApprovalRequestTransformer.transform(created);
}
