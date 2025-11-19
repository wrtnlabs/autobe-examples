import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardChannel";

export async function getDiscussionBoardChannelsChannelName(props: {
  channelName: string;
}): Promise<IDiscussionBoardChannel> {
  const channel = await MyGlobal.prisma.discussion_board_channels.findUnique({
    where: { name: props.channelName },
  });

  if (!channel) {
    throw new HttpException("Channel not found", 404);
  }

  return {
    id: channel.id,
    name: channel.name,
    description: channel.description,
    status: channel.status,
    created_at: toISOStringSafe(channel.created_at),
    updated_at: toISOStringSafe(channel.updated_at),
    deleted_at: channel.deleted_at
      ? toISOStringSafe(channel.deleted_at)
      : undefined,
  };
}
