import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminPromotionRequest";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallAdminPromotionRequestTransformer } from "../transformers/ShoppingMallAdminPromotionRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallSellerAdminPromotionRequests(props: {
  seller: SellerPayload;
  body: IShoppingMallAdminPromotionRequest.ICreate;
}): Promise<IShoppingMallAdminPromotionRequest> {
  const now = new Date();
  const id = v4();
  const created =
    await MyGlobal.prisma.shopping_mall_admin_promotion_requests.create({
      data: {
        id,
        actor_type: "seller",
        reason: props.body.reason,
        status: "pending",
        rejection_reason: null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
        sellerRequest: {
          create: {
            id: v4(),
            seller: { connect: { id: props.seller.id } },
            sellerSession: { connect: { id: props.seller.session_id } },
          },
        },
      },
      ...ShoppingMallAdminPromotionRequestTransformer.select(),
    });
  return await ShoppingMallAdminPromotionRequestTransformer.transform(created);
}
