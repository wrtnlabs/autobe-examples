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

export async function putDiscussionBoardAdminSystemSettingsKey(props: {
  admin: AdminPayload;
  key: string & tags.MinLength<1>;
  body: IDiscussionBoardSystemSetting.IUpdate;
}): Promise<IDiscussionBoardSystemSetting> {
  const current =
    await MyGlobal.prisma.discussion_board_system_settings.findUnique({
      where: { key: props.key },
    });
  if (!current || current.deleted_at !== null) {
    throw new HttpException("System setting not found", 404);
  }

  const updatePayload: Record<string, unknown> = {
    updated_at: toISOStringSafe(new Date()),
  };
  if ("value" in props.body) {
    updatePayload.value = props.body.value;
  }
  if ("description" in props.body) {
    updatePayload.description = props.body.description;
  }

  const updated = await MyGlobal.prisma.discussion_board_system_settings.update(
    {
      where: { key: props.key },
      data: updatePayload,
    },
  );

  return {
    id: updated.id,
    key: updated.key,
    value: updated.value,
    description: updated.description === null ? undefined : updated.description,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
