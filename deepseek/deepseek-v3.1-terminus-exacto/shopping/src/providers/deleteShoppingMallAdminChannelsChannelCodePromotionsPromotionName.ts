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

export async function deleteShoppingMallAdminChannelsChannelCodePromotionsPromotionName(props: {
  admin: AdminPayload;
  channelCode: string;
  promotionName: string;
}): Promise<IShoppingMallPromotion> {
  // First, find the channel by code to get its ID
  const channel = await MyGlobal.prisma.shopping_mall_channels.findFirst({
    where: {
      code: props.channelCode,
      deleted_at: null,
    },
  });

  if (!channel) {
    throw new HttpException("Channel not found", 404);
  }

  // Find the promotion within the specified channel
  const promotion = await MyGlobal.prisma.shopping_mall_promotions.findFirst({
    where: {
      name: props.promotionName,
      shopping_mall_channel_id: channel.id,
      deleted_at: null,
    },
    include: {
      channel: true,
      creator: true,
    },
  });

  if (!promotion) {
    throw new HttpException(
      "Promotion not found in the specified channel",
      404,
    );
  }

  // Verify administrator has permission to delete this promotion
  // Check if the admin created this promotion or has appropriate permissions
  if (promotion.shopping_mall_administrator_id !== props.admin.id) {
    // Additional permission check could be added here based on admin role
    throw new HttpException(
      "You do not have permission to delete this promotion",
      403,
    );
  }

  // Check if promotion is currently active to prevent disruption
  const currentTime = toISOStringSafe(new Date());
  if (
    promotion.is_active &&
    toISOStringSafe(promotion.start_date) <= currentTime &&
    toISOStringSafe(promotion.end_date) >= currentTime
  ) {
    throw new HttpException(
      "Cannot delete an active promotion. Please deactivate it first.",
      400,
    );
  }

  // Perform soft delete
  const deletedPromotion =
    await MyGlobal.prisma.shopping_mall_promotions.update({
      where: {
        id: promotion.id,
      },
      data: {
        deleted_at: toISOStringSafe(new Date()),
        updated_at: toISOStringSafe(new Date()),
      },
      include: {
        channel: true,
        creator: true,
      },
    });

  // Convert to API response format with proper type handling
  return {
    id: deletedPromotion.id as string & tags.Format<"uuid">,
    name: deletedPromotion.name,
    description: deletedPromotion.description ?? undefined,
    promotion_type: deletedPromotion.promotion_type,
    start_date: toISOStringSafe(deletedPromotion.start_date),
    end_date: toISOStringSafe(deletedPromotion.end_date),
    is_active: deletedPromotion.is_active,
    priority: deletedPromotion.priority,
    created_at: toISOStringSafe(deletedPromotion.created_at),
    updated_at: toISOStringSafe(deletedPromotion.updated_at),
    deleted_at: deletedPromotion.deleted_at
      ? toISOStringSafe(deletedPromotion.deleted_at)
      : undefined,
    channel: deletedPromotion.channel
      ? {
          id: deletedPromotion.channel.id as string & tags.Format<"uuid">,
          name: deletedPromotion.channel.name,
          description: deletedPromotion.channel.description ?? undefined,
          code: deletedPromotion.channel.code,
        }
      : undefined,
    creator: {
      id: deletedPromotion.creator.id as string & tags.Format<"uuid">,
      name: `${deletedPromotion.creator.first_name} ${deletedPromotion.creator.last_name}`,
      email: deletedPromotion.creator.email as string & tags.Format<"email">,
      role: deletedPromotion.creator.role,
    },
  };
}
