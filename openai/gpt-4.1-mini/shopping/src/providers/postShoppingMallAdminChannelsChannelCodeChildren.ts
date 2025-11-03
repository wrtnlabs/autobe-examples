import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallChannelDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannelDefinition";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postShoppingMallAdminChannelsChannelCodeChildren(props: {
  admin: AdminPayload;
  channelCode: string;
  body: IShoppingMallChannelDefinition.ICreate;
}): Promise<IShoppingMallChannelDefinition> {
  const { admin, channelCode, body } = props;

  const parentChannel =
    await MyGlobal.prisma.shopping_mall_channel_definitions.findFirst({
      where: {
        channel_code: channelCode,
        deleted_at: null,
      },
    });

  if (!parentChannel) {
    throw new HttpException(
      `Parent channel with code '${channelCode}' not found`,
      404,
    );
  }

  const duplicateChannel =
    await MyGlobal.prisma.shopping_mall_channel_definitions.findFirst({
      where: {
        parent_channel_id: parentChannel.id,
        channel_code: body.channel_code,
        deleted_at: null,
      },
    });

  if (duplicateChannel) {
    throw new HttpException(
      `Channel code '${body.channel_code}' already exists under parent channel '${channelCode}'`,
      409,
    );
  }

  const now = toISOStringSafe(new Date());

  const created =
    await MyGlobal.prisma.shopping_mall_channel_definitions.create({
      data: {
        id: v4(),
        parent_channel_id: parentChannel.id,
        channel_code: body.channel_code,
        channel_name: body.channel_name,
        description: body.description ?? null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });

  return {
    id: created.id,
    parent_channel_id: created.parent_channel_id ?? undefined,
    channel_code: created.channel_code,
    channel_name: created.channel_name,
    description: created.description ?? undefined,
    created_at: now,
    updated_at: now,
    deleted_at:
      created.deleted_at !== null && created.deleted_at !== undefined
        ? toISOStringSafe(created.deleted_at)
        : created.deleted_at,
  };
}
