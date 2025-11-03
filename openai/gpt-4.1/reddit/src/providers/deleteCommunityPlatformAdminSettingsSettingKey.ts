import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteCommunityPlatformAdminSettingsSettingKey(props: {
  admin: AdminPayload;
  settingKey: string;
}): Promise<void> {
  // Attempt to hard delete the setting by setting_key (unique), throw 404 if not found
  const deleted = await MyGlobal.prisma.community_platform_settings.deleteMany({
    where: {
      setting_key: props.settingKey,
    },
  });
  if (deleted.count === 0) {
    throw new HttpException("Setting not found", 404);
  }
  // No return value needed (void)
}
