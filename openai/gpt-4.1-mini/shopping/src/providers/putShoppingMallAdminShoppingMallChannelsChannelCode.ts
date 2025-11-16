import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putShoppingMallAdminShoppingMallChannelsChannelCode(props: {
  admin: AdminPayload;
  channelCode: string;
  body: IShoppingMallChannel.IUpdate;
}): Promise<IShoppingMallChannel> {
  const existing = await MyGlobal.prisma.shopping_mall_channels.findUnique({
    where: { code: props.channelCode },
  });

  if (!existing) {
    throw new HttpException("Shopping mall channel not found", 404);
  }

  const updated = await MyGlobal.prisma.shopping_mall_channels.update({
    where: { code: props.channelCode },
    data: {
      name: props.body.name,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: updated.id,
    code: updated.code,
    name: updated.name,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: updated.updated_at ? toISOStringSafe(updated.updated_at) : null,
  };
}
