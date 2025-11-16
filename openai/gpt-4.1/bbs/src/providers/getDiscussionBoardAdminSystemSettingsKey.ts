import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemSetting";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getDiscussionBoardAdminSystemSettingsKey(props: {
  admin: AdminPayload;
  key: string;
}): Promise<IDiscussionBoardSystemSetting> {
  const record =
    await MyGlobal.prisma.discussion_board_system_settings.findFirst({
      where: {
        key: props.key,
        deleted_at: null,
      },
    });
  if (!record) {
    throw new HttpException("System setting not found", 404);
  }
  return {
    id: record.id,
    key: record.key,
    value: record.value,
    description: record.description === null ? undefined : record.description,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at:
      record.deleted_at === null
        ? undefined
        : toISOStringSafe(record.deleted_at),
  };
}
