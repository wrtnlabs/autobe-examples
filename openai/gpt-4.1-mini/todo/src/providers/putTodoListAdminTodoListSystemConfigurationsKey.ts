import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSystemConfiguration";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putTodoListAdminTodoListSystemConfigurationsKey(props: {
  admin: AdminPayload;
  key: string;
  body: ITodoListSystemConfiguration.IUpdate;
}): Promise<ITodoListSystemConfiguration> {
  const existing =
    await MyGlobal.prisma.todo_list_system_configurations.findUnique({
      where: { key: props.key },
    });

  if (existing === null) {
    throw new HttpException(
      `System configuration key not found: ${props.key}`,
      404,
    );
  }

  const updated = await MyGlobal.prisma.todo_list_system_configurations.update({
    where: { key: props.key },
    data: {
      value: props.body.value ?? undefined,
      description: props.body.description ?? undefined,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    key: updated.key,
    value: updated.value,
    description: updated.description ?? null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
