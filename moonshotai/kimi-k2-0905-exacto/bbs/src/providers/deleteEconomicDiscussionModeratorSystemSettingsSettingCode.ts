import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function deleteEconomicDiscussionModeratorSystemSettingsSettingCode(props: {
  moderator: ModeratorPayload;
  settingCode: string;
}): Promise<void> {
  // Find the system setting by the unique setting_key
  const setting =
    await MyGlobal.prisma.economic_discussion_system_settings.findUnique({
      where: {
        setting_key: props.settingCode,
      },
    });

  if (!setting) {
    throw new HttpException("System setting not found", 404);
  }

  // Check if this is a system-critical setting that should not be deleted
  if (setting.is_system_critical) {
    throw new HttpException(
      "Cannot delete system-critical configuration setting",
      403,
    );
  }

  // Delete the setting - use the primary key (id) for deletion
  await MyGlobal.prisma.economic_discussion_system_settings.delete({
    where: {
      id: setting.id,
    },
  });
}
