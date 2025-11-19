import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemConfig";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putDiscussionBoardAdminSystemConfigsConfigKey(props: {
  admin: AdminPayload;
  configKey: string;
  body: IDiscussionBoardSystemConfig.IUpdate;
}): Promise<IDiscussionBoardSystemConfig> {
  const found = await MyGlobal.prisma.discussion_board_system_configs.findFirst(
    {
      where: {
        config_key: props.configKey,
        deleted_at: null,
      },
    },
  );
  if (!found) {
    throw new HttpException("Configuration key not found", 404);
  }
  const updated = await MyGlobal.prisma.discussion_board_system_configs.update({
    where: { config_key: props.configKey },
    data: {
      config_value: props.body.config_value,
      description:
        props.body.description === undefined
          ? undefined
          : props.body.description,
      updated_at: toISOStringSafe(new Date()),
    },
  });
  return {
    id: updated.id,
    config_key: updated.config_key,
    config_value: updated.config_value,
    description:
      updated.description === null
        ? null
        : updated.description === undefined
          ? undefined
          : updated.description,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at === null || updated.deleted_at === undefined
        ? undefined
        : toISOStringSafe(updated.deleted_at),
  };
}
