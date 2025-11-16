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

export async function putTodoAppTodoAdminTodoStatusesStatusCode(props: {
  todoAdmin: TodoadminPayload;
  statusCode: string;
  body: ITodoAppTodoStatus.IUpdate;
}): Promise<ITodoAppTodoStatus> {
  const code = props.statusCode;
  const body = props.body;

  const updatedRow = await MyGlobal.prisma.$transaction(async (tx) => {
    const existing = await tx.todo_app_todo_statuses.findUnique({
      where: { code },
    });

    if (existing === null) {
      throw new HttpException("Status not found", 404);
    }

    const data = {
      updated_at: toISOStringSafe(new Date()),
      ...(body.label !== undefined && { label: body.label }),
      ...(Object.prototype.hasOwnProperty.call(body, "description") && {
        description: body.description,
      }),
      ...(Object.prototype.hasOwnProperty.call(body, "group") && {
        group: body.group,
      }),
      ...(body.sort_order !== undefined && { sort_order: body.sort_order }),
      ...(body.is_default !== undefined && { is_default: body.is_default }),
      ...(body.is_active !== undefined && { is_active: body.is_active }),
    };

    const updated = await tx.todo_app_todo_statuses.update({
      where: { code },
      data,
    });

    if (body.is_default === true) {
      await tx.todo_app_todo_statuses.updateMany({
        where: {
          code: { not: code },
          is_default: true,
        },
        data: {
          is_default: false,
          updated_at: toISOStringSafe(new Date()),
        },
      });
    }

    const reloaded = await tx.todo_app_todo_statuses.findUnique({
      where: { code },
    });

    if (reloaded === null) {
      throw new HttpException("Status not found after update", 500);
    }

    return reloaded;
  });

  return {
    id: updatedRow.id,
    code: updatedRow.code,
    label: updatedRow.label,
    description: updatedRow.description ?? undefined,
    group: updatedRow.group ?? undefined,
    sort_order: updatedRow.sort_order,
    is_default: updatedRow.is_default,
    is_active: updatedRow.is_active,
    created_at: toISOStringSafe(updatedRow.created_at),
    updated_at: toISOStringSafe(updatedRow.updated_at),
    deleted_at:
      updatedRow.deleted_at === null || updatedRow.deleted_at === undefined
        ? undefined
        : toISOStringSafe(updatedRow.deleted_at),
  };
}
