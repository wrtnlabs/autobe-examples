import { IDiscussionBoardSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemSetting";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardSuperAdminSettingsSettingId(props: {
  superAdmin: SuperadminPayload;
  settingId: string;
}): Promise<IDiscussionBoardSystemSetting> {
  const setting =
    await MyGlobal.prisma.discussion_board_system_settings.findUnique({
      where: {
        config_key: props.settingId,
      },
    });
  if (!setting) {
    throw new HttpException("Setting not found", 404);
  }
  return {
    id: setting.id,
    config_key: setting.config_key,
    config_value: setting.config_value,
    description: setting.description === null ? undefined : setting.description,
    category: setting.category === null ? undefined : setting.category,
    is_enabled: setting.is_enabled,
    created_at: setting.created_at,
    updated_at: setting.updated_at,
    deleted_at: setting.deleted_at === null ? undefined : setting.deleted_at,
  };
}
