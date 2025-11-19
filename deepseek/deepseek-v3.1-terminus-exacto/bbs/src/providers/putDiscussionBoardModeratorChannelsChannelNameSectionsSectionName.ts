import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IDiscussionBoardChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardChannel";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function putDiscussionBoardModeratorChannelsChannelNameSectionsSectionName(props: {
  moderator: ModeratorPayload;
  channelName: string;
  sectionName: string;
  body: IDiscussionBoardSection.IUpdate;
}): Promise<IDiscussionBoardSection> {
  // Find the current channel by name
  const currentChannel =
    await MyGlobal.prisma.discussion_board_channels.findFirst({
      where: {
        name: props.channelName,
        deleted_at: null,
      },
    });

  if (!currentChannel) {
    throw new HttpException("Channel not found", 404);
  }

  // Find the section by name within the current channel
  const existingSection =
    await MyGlobal.prisma.discussion_board_sections.findFirst({
      where: {
        name: props.sectionName,
        discussion_board_channel_id: currentChannel.id,
        deleted_at: null,
      },
    });

  if (!existingSection) {
    throw new HttpException("Section not found", 404);
  }

  // Handle channel reassignment if provided
  let targetChannelId = currentChannel.id;
  if (props.body.channel !== undefined) {
    const targetChannel =
      await MyGlobal.prisma.discussion_board_channels.findFirst({
        where: {
          id: props.body.channel.id,
          deleted_at: null,
        },
      });

    if (!targetChannel) {
      throw new HttpException("Target channel not found", 404);
    }
    targetChannelId = targetChannel.id;
  }

  // Prepare update data
  const updateData: Record<string, unknown> = {
    updated_at: toISOStringSafe(new Date()),
  };

  // Only include provided fields
  if (props.body.name !== undefined) {
    updateData.name = props.body.name;
  }

  if (props.body.description !== undefined) {
    updateData.description = props.body.description;
  }

  // Update channel assignment if changed
  if (targetChannelId !== currentChannel.id) {
    updateData.discussion_board_channel_id = targetChannelId;
  }

  // Update the section
  const updated = await MyGlobal.prisma.discussion_board_sections.update({
    where: { id: existingSection.id },
    data: updateData,
  });

  return {
    id: updated.id,
    name: updated.name,
    description: updated.description,
    status: updated.status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
