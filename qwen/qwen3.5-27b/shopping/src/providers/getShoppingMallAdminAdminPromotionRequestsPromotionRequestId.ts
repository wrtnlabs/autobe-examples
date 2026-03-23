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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallAdminPromotionRequestTransformer } from "../transformers/ShoppingMallAdminPromotionRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallAdminAdminPromotionRequestsPromotionRequestId(props: {
  admin: AdminPayload;
  promotionRequestId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAdminPromotionRequest> {
  // Verify super administrator access
  const requestingAdmin =
    await MyGlobal.prisma.shopping_mall_admins.findUniqueOrThrow({
      where: {
        id: props.admin.id,
        deleted_at: null,
      },
      select: {
        grade: true,
      },
    });
  if (requestingAdmin.grade !== "super") {
    throw new HttpException(
      "Only super administrators can access promotion requests",
      403,
    );
  }
  // Retrieve the promotion request with nested admin information
  const promotionRequest =
    await MyGlobal.prisma.shopping_mall_admin_promotion_requests.findUniqueOrThrow(
      {
        where: {
          id: props.promotionRequestId,
          deleted_at: null,
        },
        ...ShoppingMallAdminPromotionRequestTransformer.select(),
      },
    );
  return await ShoppingMallAdminPromotionRequestTransformer.transform(
    promotionRequest,
  );
}
