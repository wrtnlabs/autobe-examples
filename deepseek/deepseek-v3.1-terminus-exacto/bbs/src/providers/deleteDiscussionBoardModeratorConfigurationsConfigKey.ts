import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function deleteDiscussionBoardModeratorConfigurationsConfigKey(props: {
  moderator: ModeratorPayload;
  configKey: string;
}): Promise<void> {
  // Check if configuration exists
  const existingConfig =
    await MyGlobal.prisma.discussion_board_configurations.findUnique({
      where: {
        config_key: props.configKey,
      },
    });

  if (!existingConfig) {
    throw new HttpException("Configuration setting not found", 404);
  }

  // Perform hard delete
  await MyGlobal.prisma.discussion_board_configurations.delete({
    where: {
      config_key: props.configKey,
    },
  });
}
