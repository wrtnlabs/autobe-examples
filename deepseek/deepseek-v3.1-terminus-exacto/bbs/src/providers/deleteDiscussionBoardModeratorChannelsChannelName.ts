import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function deleteDiscussionBoardModeratorChannelsChannelName(props: {
  moderator: ModeratorPayload;
  channelName: string;
}): Promise<void> {
  // Check if channel exists
  const existingChannel =
    await MyGlobal.prisma.discussion_board_channels.findUnique({
      where: { name: props.channelName },
    });

  if (!existingChannel) {
    throw new HttpException("Channel not found", 404);
  }

  // Perform hard delete as specified in operation description
  await MyGlobal.prisma.discussion_board_channels.delete({
    where: { name: props.channelName },
  });
}
