import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteDiscussionBoardAdminSystemSettingsSettingKey(props: {
  admin: AdminPayload;
  settingKey: string;
}): Promise<void> {
  const setting =
    await MyGlobal.prisma.discussion_board_system_settings.findFirst({
      where: {
        key: props.settingKey,
      },
    });
  if (setting === null) {
    throw new HttpException("System setting not found", 404);
  }
  if (setting.deleted_at !== null) {
    throw new HttpException("System setting already deleted", 400);
  }
  const now = new Date().toISOString() as string & tags.Format<"date-time">;
  const auditId = v4() as string & tags.Format<"uuid">;
  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.discussion_board_system_settings.update({
      where: { id: setting.id },
      data: {
        deleted_at: now,
      },
    }),
    MyGlobal.prisma.discussion_board_audit_logs.create({
      data: {
        id: auditId,
        admin_id: props.admin.id,
        actor_type: "admin",
        action_type: "system_setting.delete",
        resource_type: "system_setting",
        resource_id: setting.id,
        metadata: JSON.stringify({ setting_key: props.settingKey }),
        created_at: now,
      },
    }),
  ]);
}
