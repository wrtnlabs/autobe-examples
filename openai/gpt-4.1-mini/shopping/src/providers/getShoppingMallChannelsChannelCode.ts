import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallChannelDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannelDefinition";

export async function getShoppingMallChannelsChannelCode(props: {
  channelCode: string;
}): Promise<IShoppingMallChannelDefinition> {
  const { channelCode } = props;
  const channel =
    await MyGlobal.prisma.shopping_mall_channel_definitions.findUniqueOrThrow({
      where: { channel_code: channelCode },
    });
  return {
    id: channel.id,
    parent_channel_id:
      channel.parent_channel_id === null
        ? null
        : (channel.parent_channel_id ?? undefined),
    channel_code: channel.channel_code,
    channel_name: channel.channel_name,
    description:
      channel.description === null ? null : (channel.description ?? undefined),
    created_at: toISOStringSafe(channel.created_at),
    updated_at: toISOStringSafe(channel.updated_at),
    deleted_at:
      channel.deleted_at === null
        ? null
        : channel.deleted_at
          ? toISOStringSafe(channel.deleted_at)
          : undefined,
  };
}
