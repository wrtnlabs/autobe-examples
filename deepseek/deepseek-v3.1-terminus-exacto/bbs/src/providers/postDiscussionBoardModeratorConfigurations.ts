import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardConfiguration";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function postDiscussionBoardModeratorConfigurations(props: {
  moderator: ModeratorPayload;
  body: IDiscussionBoardConfiguration.ICreate;
}): Promise<IDiscussionBoardConfiguration> {
  // Check if config_key already exists
  const existing =
    await MyGlobal.prisma.discussion_board_configurations.findUnique({
      where: { config_key: props.body.config_key },
    });

  if (existing) {
    throw new HttpException("Configuration key already exists", 400);
  }

  const now = toISOStringSafe(new Date());
  const id = v4();

  const created = await MyGlobal.prisma.discussion_board_configurations.create({
    data: {
      id: id,
      config_key: props.body.config_key,
      config_value: props.body.config_value,
      config_type: props.body.config_type,
      description: props.body.description,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: created.id as string & tags.Format<"uuid">,
    config_key: created.config_key,
    config_value: created.config_value,
    config_type: created.config_type,
    description: created.description,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
