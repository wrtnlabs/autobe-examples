import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminuserPayload } from "../decorators/payload/AdminuserPayload";

export async function deleteTodoAppAdminUserSystemSettingsSettingKey(props: {
  adminUser: AdminuserPayload;
  settingKey: string;
}): Promise<void> {
  // Look up an active (non-deleted) system setting by its unique business key
  const existing = await MyGlobal.prisma.todo_app_system_settings.findFirst({
    where: {
      key: props.settingKey,
      deleted_at: null,
    },
  });

  if (existing === null) {
    // No active setting with this key exists, treat as not found
    throw new HttpException("System setting not found", 404);
  }

  // Soft delete the setting by marking it as deleted and disabling it
  await MyGlobal.prisma.todo_app_system_settings.update({
    where: {
      id: existing.id,
    },
    data: {
      enabled: false,
      deleted_at: new Date(),
    },
  });

  // Successful completion with no response body
}
