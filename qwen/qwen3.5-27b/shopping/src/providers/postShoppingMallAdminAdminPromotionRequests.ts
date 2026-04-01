import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { IShoppingMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminPromotionRequest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallAdminPromotionRequestCollector } from "../collectors/ShoppingMallAdminPromotionRequestCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallAdminPromotionRequestTransformer } from "../transformers/ShoppingMallAdminPromotionRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAdminAdminPromotionRequests(props: {
  admin: AdminPayload;
  body: IShoppingMallAdminPromotionRequest.ICreate;
}): Promise<IShoppingMallAdminPromotionRequest> {
  // Validate reason is not empty or whitespace
  if (!props.body.reason || props.body.reason.trim().length === 0) {
    throw new HttpException("Reason cannot be empty", 400);
  }
  // Check for existing pending request
  const existingPending =
    await MyGlobal.prisma.shopping_mall_admin_promotion_requests.findFirst({
      where: {
        shopping_mall_admin_id: props.admin.id,
        status: "pending",
        deleted_at: null,
      },
    });
  if (existingPending !== null) {
    throw new HttpException(
      "You already have a pending promotion request",
      409,
    );
  }
  // Create the promotion request using Collector and Transformer
  const created =
    await MyGlobal.prisma.shopping_mall_admin_promotion_requests.create({
      data: await ShoppingMallAdminPromotionRequestCollector.collect({
        body: props.body,
        shoppingMallAdmins: {
          id: props.admin.id,
        } satisfies IEntity,
      }),
      ...ShoppingMallAdminPromotionRequestTransformer.select(),
    });
  return await ShoppingMallAdminPromotionRequestTransformer.transform(created);
}
