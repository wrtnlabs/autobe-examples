import { IDiscussionBoardSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemSetting";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardSystemSettingTransformer } from "../transformers/DiscussionBoardSystemSettingTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardAdminSystemSettingsSettingKey(props: {
  admin: AdminPayload;
  settingKey: string;
  body: IDiscussionBoardSystemSetting.IUpdate;
}): Promise<IDiscussionBoardSystemSetting> {
  // Find the setting by key
  const setting =
    await MyGlobal.prisma.discussion_board_system_settings.findUnique({
      where: { key: props.settingKey },
      select: { id: true, deleted_at: true },
    });
  // Check if setting exists
  if (setting === null) {
    throw new HttpException("Setting not found", 404);
  }
  // Check if setting is soft-deleted
  if (setting.deleted_at !== null) {
    throw new HttpException("Cannot update a deleted setting", 400);
  }
  // Update the setting
  await MyGlobal.prisma.discussion_board_system_settings.update({
    where: { key: props.settingKey },
    data: {
      ...(props.body.value !== undefined && { value: props.body.value }),
      ...(props.body.description !== undefined && {
        description: props.body.description,
      }),
      updated_at: new Date(),
    },
  });
  // Fetch the updated setting
  const updated =
    await MyGlobal.prisma.discussion_board_system_settings.findUniqueOrThrow({
      where: { key: props.settingKey },
      ...DiscussionBoardSystemSettingTransformer.select(),
    });
  // Transform and return
  return await DiscussionBoardSystemSettingTransformer.transform(updated);
}
