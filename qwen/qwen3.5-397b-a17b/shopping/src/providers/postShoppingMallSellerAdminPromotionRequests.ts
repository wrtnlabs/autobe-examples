import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminPromotionRequest";
import { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallAdminPromotionRequestCollector } from "../collectors/ShoppingMallAdminPromotionRequestCollector";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallAdminPromotionRequestTransformer } from "../transformers/ShoppingMallAdminPromotionRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallSellerAdminPromotionRequests(props: {
  seller: SellerPayload;
  body: IShoppingMallAdminPromotionRequest.ICreate;
}): Promise<IShoppingMallAdminPromotionRequest> {
  // Check for existing pending promotion request for this seller
  const existingPending =
    await MyGlobal.prisma.shopping_mall_admin_promotion_requests.findFirst({
      where: {
        deleted_at: null,
        status: "pending",
        sellerApplicant: {
          shopping_mall_seller_id: props.seller.id,
          deleted_at: null,
        },
      },
    });
  if (existingPending !== null) {
    throw new HttpException("A pending promotion request already exists", 400);
  }
  const record =
    await MyGlobal.prisma.shopping_mall_admin_promotion_requests.create({
      data: await ShoppingMallAdminPromotionRequestCollector.collect({
        body: props.body,
        shoppingMallMembers: { id: v4() },
        shoppingMallSellers: { id: props.seller.id },
        shoppingMallMemberSessions: { id: v4() },
        shoppingMallSellerSessions: { id: props.seller.session_id },
      }),
      ...ShoppingMallAdminPromotionRequestTransformer.select(),
    });
  return await ShoppingMallAdminPromotionRequestTransformer.transform(record);
}
