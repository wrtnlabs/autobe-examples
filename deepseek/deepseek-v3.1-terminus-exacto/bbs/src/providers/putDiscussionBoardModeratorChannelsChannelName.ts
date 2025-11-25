import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardChannel";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function putDiscussionBoardModeratorChannelsChannelName(props: {
  moderator: ModeratorPayload;
  channelName: string;
  body: IDiscussionBoardChannel.IUpdate;
}): Promise<IDiscussionBoardChannel> {
  // Find the existing channel by name
  const existingChannel =
    await MyGlobal.prisma.discussion_board_channels.findUnique({
      where: { name: props.channelName },
    });

  if (!existingChannel) {
    throw new HttpException("Channel not found", 404);
  }

  // Verify channel is not deleted
  if (existingChannel.deleted_at !== null) {
    throw new HttpException("Channel has been deleted", 404);
  }

  // Check if any fields are being updated
  const hasUpdates =
    props.body.description !== undefined || props.body.status !== undefined;

  if (!hasUpdates) {
    throw new HttpException("No fields provided for update", 400);
  }

  // Prepare update data
  const updateData: Prisma.discussion_board_channelsUpdateInput = {
    updated_at: toISOStringSafe(new Date()),
  };

  // Only update description if provided
  if (props.body.description !== undefined) {
    updateData.description = props.body.description;
  }

  // Only update status if provided
  if (props.body.status !== undefined) {
    updateData.status = props.body.status;
  }

  // Perform the update
  const updatedChannel = await MyGlobal.prisma.discussion_board_channels.update(
    {
      where: { id: existingChannel.id },
      data: updateData,
    },
  );

  // Convert to API response format
  return {
    id: updatedChannel.id as string & tags.Format<"uuid">,
    name: updatedChannel.name,
    description: updatedChannel.description,
    status: updatedChannel.status,
    created_at: toISOStringSafe(updatedChannel.created_at),
    updated_at: toISOStringSafe(updatedChannel.updated_at),
    deleted_at: updatedChannel.deleted_at
      ? toISOStringSafe(updatedChannel.deleted_at)
      : undefined,
  };
}
