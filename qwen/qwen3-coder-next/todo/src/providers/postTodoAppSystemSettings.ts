import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemSetting";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { TodoAppSystemSettingCollector } from "../collectors/TodoAppSystemSettingCollector";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postTodoAppSystemSettings(props: {
  body: ITodoAppSystemSetting.ICreate;
}): Promise<ITodoAppSystemSetting> {
  const created = await MyGlobal.prisma.todo_app_system_settings.create({
    data: await TodoAppSystemSettingCollector.collect({
      body: props.body,
    }),
    select: {
      id: true,
      key: true,
      value: true,
      description: true,
      is_json: true,
      created_at: true,
      updated_at: true,
    },
  });
  return {
    id: created.id,
    key: created.key,
    value: created.value,
    description: created.description ?? undefined,
    is_json: created.is_json,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
