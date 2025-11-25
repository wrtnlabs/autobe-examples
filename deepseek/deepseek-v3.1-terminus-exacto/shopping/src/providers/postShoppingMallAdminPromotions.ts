import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
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

export async function postShoppingMallAdminPromotions(props: {
  admin: AdminPayload;
  body: IShoppingMallPromotion.ICreate;
}): Promise<IShoppingMallPromotion> {
  // Check if promotion name already exists
  const existingPromotion =
    await MyGlobal.prisma.shopping_mall_promotions.findFirst({
      where: {
        name: props.body.name,
        deleted_at: null,
      },
    });

  if (existingPromotion) {
    throw new HttpException("Promotion name already exists", 400);
  }

  const currentTime = toISOStringSafe(new Date());

  // Create the promotion
  const created = await MyGlobal.prisma.shopping_mall_promotions.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      name: props.body.name,
      description: props.body.description ?? null,
      promotion_type: props.body.promotion_type,
      start_date: props.body.start_date,
      end_date: props.body.end_date,
      is_active: props.body.is_active,
      priority: props.body.priority,
      shopping_mall_channel_id: props.body.channel_id ?? null,
      shopping_mall_administrator_id: props.admin.id,
      shopping_mall_administrator_session_id: props.admin.session_id,
      created_at: currentTime,
      updated_at: currentTime,
      deleted_at: null,
    },
  });

  // Fetch related data with proper error handling
  const [channel, creator] = await Promise.all([
    props.body.channel_id
      ? MyGlobal.prisma.shopping_mall_channels.findUnique({
          where: { id: props.body.channel_id },
        })
      : Promise.resolve(null),
    MyGlobal.prisma.shopping_mall_administrators.findUnique({
      where: { id: props.admin.id },
    }),
  ]);

  if (!creator) {
    throw new HttpException("Administrator not found", 404);
  }

  // Format channel summary if present
  const channelSummary = channel
    ? {
        id: channel.id,
        name: channel.name,
        description: channel.description ?? undefined,
        code: channel.code,
      }
    : undefined;

  // Format creator summary - use first_name and last_name instead of name
  const creatorSummary = {
    id: creator.id,
    name: `${creator.first_name} ${creator.last_name}`,
    email: creator.email,
    role: creator.role,
  };

  return {
    id: created.id,
    name: created.name,
    description: created.description ?? undefined,
    promotion_type: created.promotion_type,
    start_date: toISOStringSafe(created.start_date),
    end_date: toISOStringSafe(created.end_date),
    is_active: created.is_active,
    priority: created.priority,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at
      ? toISOStringSafe(created.deleted_at)
      : undefined,
    channel: channelSummary,
    creator: creatorSummary,
  };
}
