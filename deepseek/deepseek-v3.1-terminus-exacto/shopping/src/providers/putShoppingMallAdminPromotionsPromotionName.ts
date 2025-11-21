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

export async function putShoppingMallAdminPromotionsPromotionName(props: {
  admin: AdminPayload;
  promotionName: string;
  body: IShoppingMallPromotion.IUpdate;
}): Promise<IShoppingMallPromotion> {
  // Find existing promotion by unique name
  const existing = await MyGlobal.prisma.shopping_mall_promotions.findUnique({
    where: {
      name: props.promotionName,
      deleted_at: null,
    },
    include: {
      channel: true,
      creator: true,
    },
  });

  if (!existing) {
    throw new HttpException("Promotion not found", 404);
  }

  // Verify administrator has permission to update this promotion
  if (existing.shopping_mall_administrator_id !== props.admin.id) {
    throw new HttpException(
      "You do not have permission to update this promotion",
      403,
    );
  }

  // Check if name is being updated and validate uniqueness
  if (props.body.name && props.body.name !== props.promotionName) {
    const existingWithNewName =
      await MyGlobal.prisma.shopping_mall_promotions.findUnique({
        where: {
          name: props.body.name,
          deleted_at: null,
        },
      });

    if (existingWithNewName) {
      throw new HttpException("Promotion name already exists", 400);
    }
  }

  // Validate date constraints using string comparison
  if (props.body.start_date && props.body.end_date) {
    if (props.body.start_date >= props.body.end_date) {
      throw new HttpException("Start date must be before end date", 400);
    }
  }

  // Build update data with proper null/undefined handling
  const updateData: Record<string, unknown> = {
    name: props.body.name ?? existing.name,
    promotion_type: props.body.promotion_type ?? existing.promotion_type,
    is_active: props.body.is_active ?? existing.is_active,
    priority: props.body.priority ?? existing.priority,
    updated_at: toISOStringSafe(new Date()),
  };

  // Handle optional fields with proper null/undefined conversion
  if (props.body.description !== undefined) {
    updateData.description =
      props.body.description === null ? null : props.body.description;
  }

  if (props.body.start_date !== undefined) {
    updateData.start_date = props.body.start_date;
  }

  if (props.body.end_date !== undefined) {
    updateData.end_date = props.body.end_date;
  }

  if (props.body.shopping_mall_channel_id !== undefined) {
    updateData.shopping_mall_channel_id =
      props.body.shopping_mall_channel_id === null
        ? null
        : props.body.shopping_mall_channel_id;
  }

  // Update the promotion
  const updated = await MyGlobal.prisma.shopping_mall_promotions.update({
    where: {
      id: existing.id,
    },
    data: updateData,
    include: {
      channel: true,
      creator: true,
    },
  });

  // Convert to API response format with proper null/undefined handling
  return {
    id: updated.id,
    name: updated.name,
    description: updated.description === null ? undefined : updated.description,
    promotion_type: updated.promotion_type,
    start_date: toISOStringSafe(updated.start_date),
    end_date: toISOStringSafe(updated.end_date),
    is_active: updated.is_active,
    priority: updated.priority,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
    channel: updated.channel
      ? {
          id: updated.channel.id,
          name: updated.channel.name,
          description:
            updated.channel.description === null
              ? undefined
              : updated.channel.description,
          code: updated.channel.code,
        }
      : undefined,
    creator: {
      id: updated.creator.id,
      name: `${updated.creator.first_name} ${updated.creator.last_name}`,
      email: updated.creator.email,
      role: updated.creator.role,
    },
  };
}
