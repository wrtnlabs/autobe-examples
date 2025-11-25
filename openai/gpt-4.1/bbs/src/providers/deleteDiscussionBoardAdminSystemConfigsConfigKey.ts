import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemConfig";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteDiscussionBoardAdminSystemConfigsConfigKey(props: {
  admin: AdminPayload;
  configKey: string;
}): Promise<IDiscussionBoardSystemConfig> {
  // Query configuration: ensure exists and not deleted
  const config =
    await MyGlobal.prisma.discussion_board_system_configs.findUnique({
      where: { config_key: props.configKey, deleted_at: null },
    });
  if (!config) {
    throw new HttpException("Configuration not found or already deleted.", 404);
  }
  const now = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.discussion_board_system_configs.update({
    where: { id: config.id },
    data: { deleted_at: now, updated_at: now },
  });
  return {
    id: updated.id,
    config_key: updated.config_key,
    config_value: updated.config_value,
    description:
      typeof updated.description !== "undefined"
        ? updated.description
        : undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      typeof updated.deleted_at !== "undefined" && updated.deleted_at !== null
        ? toISOStringSafe(updated.deleted_at)
        : updated.deleted_at === null
          ? null
          : undefined,
  };
}
