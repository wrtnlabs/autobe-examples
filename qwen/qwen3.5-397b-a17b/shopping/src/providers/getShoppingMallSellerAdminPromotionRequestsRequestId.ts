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
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallAdminPromotionRequestTransformer } from "../transformers/ShoppingMallAdminPromotionRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallSellerAdminPromotionRequestsRequestId(props: {
  seller: SellerPayload;
  requestId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAdminPromotionRequest> {
  const record =
    await MyGlobal.prisma.shopping_mall_admin_promotion_requests.findFirstOrThrow(
      {
        where: {
          id: props.requestId,
          deleted_at: null,
          sellerApplicant: {
            shopping_mall_seller_id: props.seller.id,
          },
        },
        ...ShoppingMallAdminPromotionRequestTransformer.select(),
      },
    );
  return await ShoppingMallAdminPromotionRequestTransformer.transform(record);
}
