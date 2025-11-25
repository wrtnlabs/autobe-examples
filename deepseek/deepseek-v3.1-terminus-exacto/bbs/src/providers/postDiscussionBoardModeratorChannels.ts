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

export async function postDiscussionBoardModeratorChannels(props: {
  moderator: ModeratorPayload;
  body: IDiscussionBoardChannel.ICreate;
}): Promise<IDiscussionBoardChannel> {
  // Check if channel name already exists
  const existingChannel =
    await MyGlobal.prisma.discussion_board_channels.findFirst({
      where: {
        name: props.body.name,
        deleted_at: null,
      },
    });

  if (existingChannel) {
    throw new HttpException("Channel name already exists", 400);
  }

  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.discussion_board_channels.create({
    data: {
      id: v4(),
      name: props.body.name,
      description: props.body.description,
      status: props.body.status,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  return {
    id: created.id,
    name: created.name,
    description: created.description,
    status: created.status,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at
      ? toISOStringSafe(created.deleted_at)
      : undefined,
  };
}
