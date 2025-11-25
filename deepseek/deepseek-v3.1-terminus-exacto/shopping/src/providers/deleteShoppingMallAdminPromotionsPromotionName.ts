import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminPromotionsPromotionName(props: {
  admin: AdminPayload;
  promotionName: string;
}): Promise<void> {
  // First check if promotion exists
  const promotion = await MyGlobal.prisma.shopping_mall_promotions.findFirst({
    where: {
      name: props.promotionName,
      deleted_at: null,
    },
  });

  if (!promotion) {
    throw new HttpException("Promotion not found", 404);
  }

  // Check if promotion is currently active
  const currentTime = toISOStringSafe(new Date());
  const startDate = toISOStringSafe(promotion.start_date);
  const endDate = toISOStringSafe(promotion.end_date);

  const isCurrentlyActive =
    promotion.is_active && startDate <= currentTime && endDate > currentTime;

  if (isCurrentlyActive) {
    throw new HttpException(
      "Cannot delete active promotion. Please deactivate it first.",
      400,
    );
  }

  // Perform soft delete
  await MyGlobal.prisma.shopping_mall_promotions.update({
    where: {
      id: promotion.id,
    },
    data: {
      deleted_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
  });
}
