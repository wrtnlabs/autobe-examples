import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallPromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPromotion";
import { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminPromotionsPromotionName(props: {
  admin: AdminPayload;
  promotionName: string;
}): Promise<IShoppingMallPromotion> {
  // Verify admin session is still valid
  const adminSession =
    await MyGlobal.prisma.shopping_mall_administrator_sessions.findFirst({
      where: {
        id: props.admin.session_id,
      },
    });

  if (!adminSession) {
    throw new HttpException("Admin session not found or expired", 401);
  }

  // Find promotion by unique name
  const promotion = await MyGlobal.prisma.shopping_mall_promotions.findFirst({
    where: {
      name: props.promotionName,
      deleted_at: null,
    },
    include: {
      channel: true,
      creator: {
        select: {
          id: true,
          first_name: true,
          last_name: true,
          email: true,
          role: true,
        },
      },
    },
  });

  if (!promotion) {
    throw new HttpException("Promotion not found", 404);
  }

  // Convert Date fields to ISO strings
  return {
    id: promotion.id,
    name: promotion.name,
    description: promotion.description ?? undefined,
    promotion_type: promotion.promotion_type,
    start_date: toISOStringSafe(promotion.start_date),
    end_date: toISOStringSafe(promotion.end_date),
    is_active: promotion.is_active,
    priority: promotion.priority,
    created_at: toISOStringSafe(promotion.created_at),
    updated_at: toISOStringSafe(promotion.updated_at),
    deleted_at: promotion.deleted_at
      ? toISOStringSafe(promotion.deleted_at)
      : undefined,
    channel: promotion.channel
      ? {
          id: promotion.channel.id,
          name: promotion.channel.name,
          description: promotion.channel.description ?? undefined,
          code: promotion.channel.code,
        }
      : undefined,
    creator: {
      id: promotion.creator.id,
      name: `${promotion.creator.first_name} ${promotion.creator.last_name}`,
      email: promotion.creator.email,
      role: promotion.creator.role,
    },
  };
}
