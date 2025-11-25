import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardConfiguration";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function putDiscussionBoardModeratorConfigurationsConfigKey(props: {
  moderator: ModeratorPayload;
  configKey: string;
  body: IDiscussionBoardConfiguration.IUpdate;
}): Promise<IDiscussionBoardConfiguration> {
  // Verify configuration exists
  const existing =
    await MyGlobal.prisma.discussion_board_configurations.findUnique({
      where: { config_key: props.configKey },
    });

  if (!existing) {
    throw new HttpException(
      `Configuration with key '${props.configKey}' not found`,
      404,
    );
  }

  // Update configuration with provided fields
  const updated = await MyGlobal.prisma.discussion_board_configurations.update({
    where: { config_key: props.configKey },
    data: {
      ...(props.body.config_value !== undefined && {
        config_value: props.body.config_value,
      }),
      ...(props.body.config_type !== undefined && {
        config_type: props.body.config_type,
      }),
      ...(props.body.description !== undefined && {
        description: props.body.description,
      }),
      updated_at: toISOStringSafe(new Date()),
    },
  });

  // Return properly typed response
  return {
    id: updated.id as string & tags.Format<"uuid">,
    config_key: updated.config_key,
    config_value: updated.config_value,
    config_type: updated.config_type,
    description: updated.description,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
