import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListConfiguration";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function postTodolistUserConfigurations(props: {
  user: UserPayload;
  body: ITodoListConfiguration.ICreate;
}): Promise<ITodoListConfiguration> {
  // Check if configuration key already exists
  const existing = await MyGlobal.prisma.todo_list_configurations.findFirst({
    where: {
      key: props.body.key,
      deleted_at: null,
    },
  });

  if (existing) {
    throw new HttpException(
      "Configuration key already exists. Please use a unique key.",
      400,
    );
  }

  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.todo_list_configurations.create({
    data: {
      id: v4(),
      key: props.body.key,
      value: props.body.value,
      description: props.body.description ?? null,
      category: props.body.category ?? null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  return {
    id: created.id as string & tags.Format<"uuid">,
    key: created.key,
    value: created.value,
    description: created.description === null ? undefined : created.description,
    category: created.category === null ? undefined : created.category,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at === null
        ? undefined
        : toISOStringSafe(created.deleted_at),
  };
}
