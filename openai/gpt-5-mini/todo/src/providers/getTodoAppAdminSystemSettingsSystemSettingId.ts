import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemSetting";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getTodoAppAdminSystemSettingsSystemSettingId(props: {
  admin: AdminPayload;
  systemSettingId: string & tags.Format<"uuid">;
}): Promise<ITodoAppSystemSetting> {
  const { admin, systemSettingId } = props;

  // Retrieve active system setting (deleted_at must be null)
  const setting = await MyGlobal.prisma.todo_app_system_settings.findFirst({
    where: {
      id: systemSettingId,
      deleted_at: null,
    },
  });

  const now = toISOStringSafe(new Date());

  // Record audit for the access attempt (successful or not)
  await MyGlobal.prisma.todo_app_audit_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      todo_app_admin_id: admin.id,
      todo_app_admin_session_id: admin.session_id,
      event_type: "settings.get",
      target_type: "system_setting",
      target_id: systemSettingId,
      details: setting
        ? `Retrieved system setting '${setting.key}'`
        : "System setting not found or deleted",
      created_at: now,
      updated_at: now,
    },
  });

  if (!setting) {
    throw new HttpException("Not Found", 404);
  }

  return {
    id: setting.id as string & tags.Format<"uuid">,
    key: setting.key,
    value: setting.value,
    // description is nullable and optional in the DTO; return explicit null when absent
    description: setting.description ?? null,
    isPublic: setting.is_public,
    createdAt: toISOStringSafe(setting.created_at),
    updatedAt: toISOStringSafe(setting.updated_at),
  };
}
