import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IPageITodoAppSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppSystemSetting";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ITodoAppSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemSetting";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getTodoAppSystemSettings(props: {
  admin: AdminPayload;
}): Promise<IPageITodoAppSystemSetting> {
  // Query all system settings from database
  const [settings, total] = await Promise.all([
    MyGlobal.prisma.todo_app_system_setting.findMany({
      orderBy: { updated_at: "desc" },
    }),
    MyGlobal.prisma.todo_app_system_setting.count(),
  ]);

  // Transform database records to API response format
  const data = settings.map((setting) => ({
    id: setting.id,
    setting_key: setting.setting_key,
    setting_value: setting.setting_value,
    setting_type: setting.setting_type,
    setting_category: setting.setting_category,
    description: setting.description ?? undefined,
    default_value: setting.default_value ?? undefined,
    min_value: setting.min_value ?? undefined,
    max_value: setting.max_value ?? undefined,
    is_editable: setting.is_editable,
    created_at: toISOStringSafe(setting.created_at),
    updated_at: toISOStringSafe(setting.updated_at),
  }));

  // Construct pagination metadata
  const limit = total > 0 ? total : 100;
  const pages = Math.ceil(total / limit);

  return {
    data,
    pagination: {
      current: 1,
      limit,
      records: total,
      pages,
    },
  };
}
