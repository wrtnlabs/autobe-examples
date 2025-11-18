import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppSystemSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemSettings";
import { IPageITodoAppSystemSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppSystemSettings";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchTodoAppUserSystemSettings(props: {
  user: UserPayload;
  body: ITodoAppSystemSettings.IRequest;
}): Promise<IPageITodoAppSystemSettings.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 10;
  const skip = (page - 1) * limit;

  // Build where conditions
  const where: Prisma.todo_app_system_settingsWhereInput = {};

  if (props.body.search) {
    where.OR = [
      { setting_key: { contains: props.body.search, mode: "insensitive" } },
      { setting_value: { contains: props.body.search, mode: "insensitive" } },
      { description: { contains: props.body.search, mode: "insensitive" } },
    ];
  }

  if (props.body.setting_type !== undefined) {
    where.setting_type = props.body.setting_type;
  }

  if (props.body.is_active !== undefined) {
    where.is_active = props.body.is_active;
  }

  if (props.body.environment_scope !== undefined) {
    where.environment_scope = props.body.environment_scope;
  }

  // Execute parallel queries for efficiency
  const [data, total] = await Promise.all([
    MyGlobal.prisma.todo_app_system_settings.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
    }),
    MyGlobal.prisma.todo_app_system_settings.count({ where }),
  ]);

  return {
    data: data.map((setting) => ({
      id: setting.id,
      setting_key: setting.setting_key,
      setting_value: setting.setting_value,
      setting_type: setting.setting_type,
      is_active: setting.is_active,
      environment_scope: setting.environment_scope ?? undefined,
      description: setting.description ?? undefined,
    })),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
