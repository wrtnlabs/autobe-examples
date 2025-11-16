import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppTodoStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoStatus";
import { TodoadminPayload } from "../decorators/payload/TodoadminPayload";

export async function postTodoAppTodoAdminTodoStatuses(props: {
  todoAdmin: TodoadminPayload;
  body: ITodoAppTodoStatus.ICreate;
}): Promise<ITodoAppTodoStatus> {
  // Timestamp for created_at and updated_at
  const now = new Date();

  try {
    const created = await MyGlobal.prisma.todo_app_todo_statuses.create({
      data: {
        id: v4(),
        code: props.body.code,
        label: props.body.label,
        description:
          props.body.description === undefined ? null : props.body.description,
        group: props.body.group === undefined ? null : props.body.group,
        sort_order: props.body.sort_order,
        is_default: props.body.is_default,
        is_active: props.body.is_active,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });

    return {
      id: created.id,
      code: created.code,
      label: created.label,
      description:
        created.description === null ? null : (created.description ?? null),
      group: created.group === null ? null : (created.group ?? null),
      sort_order: created.sort_order,
      is_default: created.is_default,
      is_active: created.is_active,
      created_at: toISOStringSafe(created.created_at),
      updated_at: toISOStringSafe(created.updated_at),
      deleted_at:
        created.deleted_at === null
          ? undefined
          : toISOStringSafe(created.deleted_at),
    };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2002") {
        // Unique constraint violation on code
        throw new HttpException("Todo status code must be unique", 409);
      }
    }

    throw new HttpException("Failed to create todo status", 500);
  }
}
