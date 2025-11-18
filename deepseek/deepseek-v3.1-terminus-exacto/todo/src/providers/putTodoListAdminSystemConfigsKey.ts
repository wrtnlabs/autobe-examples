import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSystemConfig";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putTodoListAdminSystemConfigsKey(props: {
  admin: AdminPayload;
  key: string;
  body: ITodoListSystemConfig.IUpdate;
}): Promise<ITodoListSystemConfig> {
  const existing = await MyGlobal.prisma.todo_list_system_configs.findUnique({
    where: { key: props.key },
  });

  if (!existing) {
    throw new HttpException("Configuration not found.", 404);
  }

  // Construct update data, following strict immutability and DTO rules
  const shouldUpdate: {
    value?: string;
    description?: string | null;
    updated_at: string;
  } = {
    updated_at: toISOStringSafe(new Date()),
  };
  if (Object.prototype.hasOwnProperty.call(props.body, "value")) {
    shouldUpdate.value = props.body.value;
  }
  if (Object.prototype.hasOwnProperty.call(props.body, "description")) {
    shouldUpdate.description = props.body.description ?? null;
  }

  const result = await MyGlobal.prisma.todo_list_system_configs.update({
    where: { key: props.key },
    data: shouldUpdate,
  });

  return {
    id: result.id,
    key: result.key,
    value: result.value,
    description:
      typeof result.description === "undefined"
        ? undefined
        : result.description,
    created_at: toISOStringSafe(result.created_at),
    updated_at: toISOStringSafe(result.updated_at),
    deleted_at:
      typeof result.deleted_at === "undefined"
        ? undefined
        : result.deleted_at === null
          ? null
          : toISOStringSafe(result.deleted_at),
  };
}
