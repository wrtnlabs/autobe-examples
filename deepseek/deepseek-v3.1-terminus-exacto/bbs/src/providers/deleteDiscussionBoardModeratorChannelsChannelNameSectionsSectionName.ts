import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function deleteDiscussionBoardModeratorChannelsChannelNameSectionsSectionName(props: {
  moderator: ModeratorPayload;
  channelName: string;
  sectionName: string;
}): Promise<void> {
  // First verify the channel exists
  const channel = await MyGlobal.prisma.discussion_board_channels.findFirst({
    where: {
      name: props.channelName,
      deleted_at: null,
    },
  });

  if (!channel) {
    throw new HttpException("Channel not found", 404);
  }

  // Find the specific section within this channel
  const section = await MyGlobal.prisma.discussion_board_sections.findFirst({
    where: {
      discussion_board_channel_id: channel.id,
      name: props.sectionName,
      deleted_at: null,
    },
  });

  if (!section) {
    throw new HttpException("Section not found", 404);
  }

  // Perform hard deletion
  await MyGlobal.prisma.discussion_board_sections.delete({
    where: {
      id: section.id,
    },
  });
}
