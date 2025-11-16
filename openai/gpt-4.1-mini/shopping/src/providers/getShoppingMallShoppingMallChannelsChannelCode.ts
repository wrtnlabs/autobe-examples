import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";

export async function getShoppingMallShoppingMallChannelsChannelCode(props: {
  channelCode: string;
}): Promise<IShoppingMallChannel> {
  const channel = await MyGlobal.prisma.shopping_mall_channels.findUnique({
    where: {
      code: props.channelCode,
    },
  });

  if (!channel) {
    throw new HttpException(
      `Shopping mall channel not found: ${props.channelCode}`,
      404,
    );
  }

  return {
    id: channel.id,
    code: channel.code,
    name: channel.name,
    created_at: toISOStringSafe(channel.created_at),
    updated_at: channel.updated_at ? toISOStringSafe(channel.updated_at) : null,
  };
}
