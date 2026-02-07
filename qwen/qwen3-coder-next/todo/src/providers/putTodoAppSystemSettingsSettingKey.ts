import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemSetting";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putTodoAppSystemSettingsSettingKey(props: {
  settingKey: string;
  body: ITodoAppSystemSetting.IUpdate;
}): Promise<ITodoAppSystemSetting> {
  const setting = await MyGlobal.prisma.todo_app_system_settings.findUnique({
    where: { key: props.settingKey },
  });
  if (!setting) throw new HttpException("Configuration not found", 404);
  const updated = await MyGlobal.prisma.todo_app_system_settings.update({
    where: { id: setting.id },
    data: {
      value: (props.body as any).value ?? "",
      description: (props.body as any).description ?? null,
      is_json: (props.body as any).is_json ?? false,
      updated_at: toISOStringSafe(new Date()),
    },
  });
  return {
    id: updated.id as string & tags.Format<"uuid">,
    key: updated.key as string,
    value: updated.value as string,
    description: updated.description ?? null,
    is_json: updated.is_json,
    created_at: toISOStringSafe(updated.created_at) as string &
      tags.Format<"date-time">,
    updated_at: toISOStringSafe(updated.updated_at) as string &
      tags.Format<"date-time">,
  };
}
