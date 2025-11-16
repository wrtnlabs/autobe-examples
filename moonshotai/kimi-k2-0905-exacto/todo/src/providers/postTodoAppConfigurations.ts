import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppConfiguration";

export async function postTodoAppConfigurations(props: {
  body: ITodoAppConfiguration.ICreate;
}): Promise<ITodoAppConfiguration> {
  const created = await MyGlobal.prisma.todo_app_configurations.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      key: props.body.key,
      value: props.body.value,
      description: props.body.description,
      category: props.body.category ?? undefined,
      is_enabled: props.body.is_enabled ?? true,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
      deleted_at: undefined,
    },
  });

  return {
    id: created.id,
    key: created.key,
    value: created.value,
    description: created.description,
    category: created.category ?? undefined,
    is_enabled: created.is_enabled,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
