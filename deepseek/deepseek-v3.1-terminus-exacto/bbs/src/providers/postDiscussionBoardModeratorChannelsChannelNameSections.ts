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

export async function postDiscussionBoardModeratorChannelsChannelNameSections(props: {
  moderator: ModeratorPayload;
  channelName: string;
  body: IDiscussionBoardSection.ICreate;
}): Promise<IDiscussionBoardSection> {
  // Verify the channel exists and is active
  const channel = await MyGlobal.prisma.discussion_board_channels.findFirst({
    where: {
      name: props.channelName,
      status: "active",
      deleted_at: null,
    },
  });

  if (!channel) {
    throw new HttpException(
      `Channel '${props.channelName}' not found or inactive`,
      404,
    );
  }

  // Verify the channel reference in body matches the path parameter
  if (props.body.channel.id !== channel.id) {
    throw new HttpException(
      "Channel ID in request body does not match path parameter",
      400,
    );
  }

  // Check if section name already exists within this channel
  const existingSection =
    await MyGlobal.prisma.discussion_board_sections.findFirst({
      where: {
        discussion_board_channel_id: channel.id,
        name: props.body.name,
        deleted_at: null,
      },
    });

  if (existingSection) {
    throw new HttpException(
      `Section '${props.body.name}' already exists in channel '${props.channelName}'`,
      409,
    );
  }

  // Generate UUID without type assertion
  const sectionId = v4();

  // Get current timestamp without using Date
  const now = toISOStringSafe(new Date());

  // Create the new section
  const created = await MyGlobal.prisma.discussion_board_sections.create({
    data: {
      id: sectionId,
      name: props.body.name,
      description: props.body.description,
      discussion_board_channel_id: channel.id,
      status: "active",
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  return {
    id: created.id as string & tags.Format<"uuid">,
    name: created.name,
    description: created.description,
    status: created.status,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
