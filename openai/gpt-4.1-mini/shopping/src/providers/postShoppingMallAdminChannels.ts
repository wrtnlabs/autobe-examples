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

export async function postShoppingMallAdminChannels(props: {
  admin: AdminPayload;
  body: IShoppingMallChannelDefinition.ICreate;
}): Promise<IShoppingMallChannelDefinition> {
  const { body } = props;

  const existing =
    await MyGlobal.prisma.shopping_mall_channel_definitions.findFirst({
      where: {
        channel_code: body.channel_code,
        deleted_at: null,
      },
    });

  if (existing) {
    throw new HttpException("Channel code already exists", 409);
  }

  if (body.parent_channel_id !== undefined && body.parent_channel_id !== null) {
    const parent =
      await MyGlobal.prisma.shopping_mall_channel_definitions.findFirst({
        where: {
          id: body.parent_channel_id,
          deleted_at: null,
        },
      });
    if (!parent) {
      throw new HttpException("Invalid parent_channel_id", 400);
    }
  }

  const now = toISOStringSafe(new Date());

  const created =
    await MyGlobal.prisma.shopping_mall_channel_definitions.create({
      data: {
        id: v4(),
        parent_channel_id: body.parent_channel_id ?? null,
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
    parent_channel_id: created.parent_channel_id ?? null,
    channel_code: created.channel_code,
    channel_name: created.channel_name,
    description: created.description ?? null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
