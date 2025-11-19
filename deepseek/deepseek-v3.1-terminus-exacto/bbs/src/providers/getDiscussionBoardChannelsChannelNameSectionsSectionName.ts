import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";

export async function getDiscussionBoardChannelsChannelNameSectionsSectionName(props: {
  channelName: string;
  sectionName: string;
}): Promise<IDiscussionBoardSection> {
  // Find the channel by name first
  const channel = await MyGlobal.prisma.discussion_board_channels.findUnique({
    where: { name: props.channelName },
    select: { id: true, status: true },
  });

  if (!channel) {
    throw new HttpException("Channel not found", 404);
  }

  if (channel.status !== "active") {
    throw new HttpException("Channel is not active", 400);
  }

  // Find the section by name within the channel
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

  // Return the section data with proper date formatting
  return {
    id: section.id as string & tags.Format<"uuid">,
    name: section.name,
    description: section.description,
    status: section.status,
    created_at: toISOStringSafe(section.created_at),
    updated_at: toISOStringSafe(section.updated_at),
  };
}
